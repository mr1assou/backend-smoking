"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = __importDefault(require("openai"));
const schema_context_1 = require("./knowledge/schema-context");
const schema_maps_1 = require("./knowledge/schema_maps");
const agent_prompts_1 = require("./prompts/agent-prompts");
const system_prompt_1 = require("./prompts/system-prompt");
const sql_guard_1 = require("./utils/sql-guard");
const prisma_service_1 = require("../prisma/prisma.service");
const MAX_SQL_RETRIES = 3;
const SQL_MAX_LIMIT = 100;
let AiService = AiService_1 = class AiService {
    config;
    prisma;
    logger = new common_1.Logger(AiService_1.name);
    openai;
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        const openaiKey = this.config.get('OPENAI_API_KEY')?.trim();
        this.openai = openaiKey ? new openai_1.default({ apiKey: openaiKey }) : null;
        if (!this.openai) {
            this.logger.warn('OPENAI_API_KEY is not configured.');
        }
    }
    async chatWithHistory(turns) {
        if (!this.openai) {
            throw new common_1.ServiceUnavailableException('OpenAI is not configured. Set OPENAI_API_KEY in the environment.');
        }
        if (turns.length === 0) {
            throw new common_1.BadRequestException('messages must not be empty');
        }
        const model = this.config.get('OPENAI_CHAT_MODEL')?.trim() || 'gpt-4o-mini';
        const lastUser = [...turns].reverse().find((t) => t.role === 'user')?.content?.trim() ?? '';
        if (this.isSensitiveRequest(lastUser)) {
            return { type: 'text', message: "I can't help with that.", meta: { intent: 'chat' } };
        }
        let intent = await this.classifyIntent(model, lastUser);
        if (intent === 'chat' && this.isBudgetOrReplacementQuestion(lastUser)) {
            intent = 'data';
        }
        if (intent === 'chat') {
            const message = await this.callLLM(model, (0, system_prompt_1.buildSystemPrompt)(), turns, 0.65);
            return { type: 'text', message, meta: { intent: 'chat' } };
        }
        const pipeline = await this.runDataPipeline(model, lastUser);
        return pipeline;
    }
    async classifyIntent(model, lastUserMessage) {
        const raw = await this.jsonModelText(model, agent_prompts_1.agentClassifierSystem, lastUserMessage, 0.1);
        try {
            const o = JSON.parse(raw);
            return o.intent === 'data' ? 'data' : 'chat';
        }
        catch {
            return 'chat';
        }
    }
    async runDataPipeline(model, userQuestion) {
        const fullSchemaPayload = (0, schema_context_1.serializeFullSchemaForAgents)();
        const linkingRaw = await this.jsonModelText(model, agent_prompts_1.agent1SchemaLinkingSystem, `User question:\n${userQuestion}\n\nfullSchema:\n${fullSchemaPayload}`, 0.0);
        const { models: linkedModels, rationale } = parseLinkingJson(linkingRaw);
        const { filtered, usedFallback } = (0, schema_context_1.resolveFilteredSchema)(linkedModels);
        const filteredPayload = JSON.stringify({ models: filtered, enums: schema_maps_1.simpleEnums }, null, 2);
        const discoveredValues = await this.discoverDistinctValues(filtered);
        const discoveredValuesPayload = JSON.stringify(discoveredValues, null, 2);
        const valueMappingRaw = await this.jsonModelText(model, agent_prompts_1.agent15ValueMappingSystem, `User question:\n${userQuestion}\n\nFiltered schema:\n${filteredPayload}\n\nDiscovered values:\n${discoveredValuesPayload}`, 0.0);
        const valueMapping = parseJsonSafe(valueMappingRaw);
        const valueMappingPayload = JSON.stringify(valueMapping ?? {}, null, 2);
        const plan = await this.callSingleUser(model, agent_prompts_1.agent2PlanningSystem, `User question:\n${userQuestion}\n\nFiltered schema:\n${filteredPayload}\n\nDiscovered values:\n${discoveredValuesPayload}\n\nValue mapping:\n${valueMappingPayload}`, 0.0);
        let sqlText = await this.callSingleUser(model, agent_prompts_1.agent3SqlGenerationSystem, `User question:\n${userQuestion}\n\nFiltered schema:\n${filteredPayload}\n\nDiscovered values:\n${discoveredValuesPayload}\n\nValue mapping:\n${valueMappingPayload}\n\nExecution plan:\n${plan}`, 0.0);
        let sql = (0, sql_guard_1.extractSqlFence)(sqlText) ?? sqlText.trim();
        let attempts = 0;
        let lastError;
        while (attempts < MAX_SQL_RETRIES) {
            attempts++;
            const guard = (0, sql_guard_1.guardReadOnlySelect)(sql, SQL_MAX_LIMIT);
            if (!guard.ok) {
                lastError = guard.error;
                this.logger.warn(`SQL guard rejected: ${guard.error}`);
                if (attempts >= MAX_SQL_RETRIES)
                    break;
                sqlText = await this.callSingleUser(model, agent_prompts_1.agent5CorrectionSystem, `User question:\n${userQuestion}\n\nDiscovered values:\n${discoveredValuesPayload}\n\nValue mapping:\n${valueMappingPayload}\n\nPlan:\n${plan}\n\nRejected SQL:\n${sql}\n\nGuard error:\n${guard.error}`, 0.0);
                sql = (0, sql_guard_1.extractSqlFence)(sqlText) ?? sqlText.trim();
                continue;
            }
            try {
                const rows = await this.prisma.$queryRawUnsafe(guard.sql);
                const data = serializeQueryResult(rows);
                const message = await this.summarizeDataAnswer(model, userQuestion, plan, guard.sql, data);
                return {
                    type: 'data',
                    message,
                    data,
                    query: guard.sql,
                    reasoning: plan,
                    meta: {
                        intent: 'data',
                        agent1_models: linkedModels,
                        agent1_rationale: rationale,
                        agent1_fallback: usedFallback,
                        agent2_plan: plan,
                        agent15_value_mapping: valueMapping ?? undefined,
                        agent4_guard_notes: guard.notes,
                        attempts,
                    },
                };
            }
            catch (e) {
                lastError = e instanceof Error ? e.message : String(e);
                this.logger.warn(`SQL execution failed (attempt ${attempts}): ${lastError}`);
                if (attempts >= MAX_SQL_RETRIES)
                    break;
                sqlText = await this.callSingleUser(model, agent_prompts_1.agent5CorrectionSystem, `User question:\n${userQuestion}\n\nDiscovered values:\n${discoveredValuesPayload}\n\nValue mapping:\n${valueMappingPayload}\n\nPlan:\n${plan}\n\nFailed SQL:\n${guard.sql}\n\nDatabase error:\n${lastError}`, 0.0);
                sql = (0, sql_guard_1.extractSqlFence)(sqlText) ?? sqlText.trim();
            }
        }
        const failMsg = `Could not run a safe read-only query after ${MAX_SQL_RETRIES} attempt(s). ${lastError ?? ''}`.trim();
        return {
            type: 'text',
            message: failMsg,
            error: lastError,
            query: sql,
            reasoning: plan,
            meta: {
                intent: 'data',
                agent1_models: linkedModels,
                agent1_rationale: rationale,
                agent1_fallback: usedFallback,
                agent2_plan: plan,
                agent15_value_mapping: valueMapping ?? undefined,
                attempts,
                last_error: lastError,
            },
        };
    }
    isBudgetOrReplacementQuestion(text) {
        const q = text.toLowerCase();
        return (q.includes('budget') ||
            q.includes('budgets') ||
            q.includes('remplacement') ||
            q.includes('remplacer') ||
            q.includes('remplacer les') ||
            q.includes('coût') ||
            q.includes('cout') ||
            q.includes('prix') ||
            q.includes('dépense') ||
            q.includes('depense') ||
            (q.includes('cost') && q.includes('repair')) ||
            (q.includes('cost') && (q.includes('replace') || q.includes('replacement'))));
    }
    isSensitiveRequest(text) {
        const q = text.toLowerCase();
        if (q.includes('schema') || q.includes('schemas') || q.includes('prisma') || q.includes('database schema')) {
            return true;
        }
        if (q.includes('table ') || q.includes('tables') || q.includes('column') || q.includes('columns') || q.includes('field') || q.includes('fields')) {
            return true;
        }
        if (q.includes('password') || q.includes('mdp') || q.includes('mot de passe') || q.includes('mot-de-passe')) {
            return true;
        }
        if (q.includes('hashed') || q.includes('refresh token') || q.includes('hashedrefreshtoken')) {
            return true;
        }
        if (q.includes('api key') || q.includes('secret') || q.includes('credential') || q.includes('credentials')) {
            return true;
        }
        if (q.includes('env') || q.includes('.env') || q.includes('database_url') || q.includes('authorization')) {
            return true;
        }
        return false;
    }
    async summarizeDataAnswer(model, userQuestion, plan, sql, data) {
        const preview = JSON.stringify(data).slice(0, 3500);
        const system = `You summarize query results for the user. Be brief, natural language, same language as the user's question when obvious. Do not repeat raw JSON; highlight counts or key facts.`;
        const user = `Question: ${userQuestion}\n\nPlan (reference):\n${plan.slice(0, 2000)}\n\nResult preview:\n${preview}`;
        return this.callSingleUser(model, system, user, 0.2);
    }
    async discoverDistinctValues(filteredModels) {
        const out = {};
        for (const [, model] of Object.entries(filteredModels)) {
            const table = model.table;
            const columns = Object.entries(model.fields)
                .filter(([, desc]) => /Status|Type|Role|\|/i.test(desc))
                .map(([field]) => field);
            if (columns.length === 0)
                continue;
            out[table] = {};
            for (const col of columns) {
                try {
                    const rows = await this.prisma.$queryRawUnsafe(`SELECT DISTINCT "${col}"::text AS value FROM "${table}" WHERE "${col}" IS NOT NULL ORDER BY 1 LIMIT 50`);
                    out[table][col] = rows
                        .map((r) => (typeof r.value === 'string' ? r.value : String(r.value)))
                        .filter((v) => v.length > 0);
                }
                catch (e) {
                    this.logger.warn(`Value discovery failed for ${table}.${col}: ${e instanceof Error ? e.message : String(e)}`);
                }
            }
            if (Object.keys(out[table]).length === 0)
                delete out[table];
        }
        return out;
    }
    async jsonModelText(model, system, user, temperature) {
        const messages = [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ];
        const completion = await this.openai.chat.completions.create({
            model,
            messages,
            temperature,
            response_format: { type: 'json_object' },
        });
        return completion.choices[0]?.message?.content?.trim() ?? '{}';
    }
    async callSingleUser(model, system, user, temperature) {
        const messages = [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ];
        const completion = await this.openai.chat.completions.create({
            model,
            messages,
            temperature,
        });
        return completion.choices[0]?.message?.content?.trim() ?? '';
    }
    async callLLM(model, systemPrompt, turns, temperature) {
        const cleanedSystemPrompt = systemPrompt.trim();
        const messages = [];
        if (cleanedSystemPrompt.length > 0) {
            messages.push({ role: 'system', content: cleanedSystemPrompt });
        }
        messages.push(...turns.map((t) => ({ role: t.role, content: t.content })));
        const completion = await this.openai.chat.completions.create({
            model,
            messages,
            temperature,
        });
        return completion.choices[0]?.message?.content?.trim() ?? '';
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], AiService);
function parseLinkingJson(raw) {
    try {
        const o = JSON.parse(raw);
        const arr = o.models ?? o.relevantModels;
        const models = Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
        return { models, rationale: typeof o.rationale === 'string' ? o.rationale : undefined };
    }
    catch {
        return { models: [] };
    }
}
function parseJsonSafe(raw) {
    try {
        return JSON.parse(raw);
    }
    catch {
        return undefined;
    }
}
function serializeQueryResult(data) {
    return JSON.parse(JSON.stringify(data, (_key, value) => {
        if (typeof value === 'bigint')
            return value.toString();
        if (value instanceof Date)
            return value.toISOString();
        if (value && typeof value === 'object' && value.constructor?.name === 'Decimal') {
            return String(value);
        }
        return value;
    }));
}
//# sourceMappingURL=ai.service.js.map