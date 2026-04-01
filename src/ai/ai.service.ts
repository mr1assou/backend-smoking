import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { serializeFullSchemaForAgents, resolveFilteredSchema } from './knowledge/schema-context';
import { simpleEnums } from './knowledge/schema_maps';
import {
    agent1SchemaLinkingSystem,
    agent15ValueMappingSystem,
    agent2PlanningSystem,
    agent3SqlGenerationSystem,
    agent5CorrectionSystem,
    agentClassifierSystem,
} from './prompts/agent-prompts';
import { buildSystemPrompt } from './prompts/system-prompt';
import { extractSqlFence, guardReadOnlySelect } from './utils/sql-guard';
import { PrismaService } from '../prisma/prisma.service';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export interface ChatResult {
    type: 'text' | 'data';
    message?: string;
    data?: unknown;
    reasoning?: string;
    error?: string;
    query?: string;
    meta?: {
        intent: 'chat' | 'data';
        agent1_models?: string[];
        agent1_rationale?: string;
        agent1_fallback?: boolean;
        agent2_plan?: string;
        agent15_value_mapping?: unknown;
        agent4_guard_notes?: string;
        attempts?: number;
        last_error?: string;
    };
}

const MAX_SQL_RETRIES = 3;
const SQL_MAX_LIMIT = 100;

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private openai: OpenAI | null;

    constructor(
        private config: ConfigService,
        private prisma: PrismaService,
    ) {
        const openaiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
        this.openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
        if (!this.openai) {
            this.logger.warn('OPENAI_API_KEY is not configured.');
        }
    }

    async chatWithHistory(turns: ChatTurn[]): Promise<ChatResult> {
        if (!this.openai) {
            throw new ServiceUnavailableException('OpenAI is not configured. Set OPENAI_API_KEY in the environment.');
        }
        if (turns.length === 0) {
            throw new BadRequestException('messages must not be empty');
        }

        const model = this.config.get<string>('OPENAI_CHAT_MODEL')?.trim() || 'gpt-4o-mini';
        const lastUser = [...turns].reverse().find((t) => t.role === 'user')?.content?.trim() ?? '';

        if (this.isSensitiveRequest(lastUser)) {
            return { type: 'text', message: "I can't help with that.", meta: { intent: 'chat' } };
        }

        let intent = await this.classifyIntent(model, lastUser);
        // Hard override: budget / replacement / coût questions almost always need DB-backed numbers.
        if (intent === 'chat' && this.isBudgetOrReplacementQuestion(lastUser)) {
            intent = 'data';
        }
        if (intent === 'chat') {
            const message = await this.callLLM(model, buildSystemPrompt(), turns, 0.65);
            return { type: 'text', message, meta: { intent: 'chat' } };
        }

        const pipeline = await this.runDataPipeline(model, lastUser);
        return pipeline;
    }

    private async classifyIntent(model: string, lastUserMessage: string): Promise<'chat' | 'data'> {
        const raw = await this.jsonModelText(model, agentClassifierSystem, lastUserMessage, 0.1);
        try {
            const o = JSON.parse(raw) as { intent?: string };
            return o.intent === 'data' ? 'data' : 'chat';
        } catch {
            return 'chat';
        }
    }

    private async runDataPipeline(model: string, userQuestion: string): Promise<ChatResult> {
        const fullSchemaPayload = serializeFullSchemaForAgents();

        const linkingRaw = await this.jsonModelText(
            model,
            agent1SchemaLinkingSystem,
            `User question:\n${userQuestion}\n\nfullSchema:\n${fullSchemaPayload}`,
            0.0,
        );

        const { models: linkedModels, rationale } = parseLinkingJson(linkingRaw);
        const { filtered, usedFallback } = resolveFilteredSchema(linkedModels);
        const filteredPayload = JSON.stringify({ models: filtered, enums: simpleEnums }, null, 2);

        const discoveredValues = await this.discoverDistinctValues(filtered);
        const discoveredValuesPayload = JSON.stringify(discoveredValues, null, 2);
        const valueMappingRaw = await this.jsonModelText(
            model,
            agent15ValueMappingSystem,
            `User question:\n${userQuestion}\n\nFiltered schema:\n${filteredPayload}\n\nDiscovered values:\n${discoveredValuesPayload}`,
            0.0,
        );
        const valueMapping = parseJsonSafe(valueMappingRaw);
        const valueMappingPayload = JSON.stringify(valueMapping ?? {}, null, 2);

        const plan = await this.callSingleUser(
            model,
            agent2PlanningSystem,
            `User question:\n${userQuestion}\n\nFiltered schema:\n${filteredPayload}\n\nDiscovered values:\n${discoveredValuesPayload}\n\nValue mapping:\n${valueMappingPayload}`,
            0.0,
        );

        let sqlText = await this.callSingleUser(
            model,
            agent3SqlGenerationSystem,
            `User question:\n${userQuestion}\n\nFiltered schema:\n${filteredPayload}\n\nDiscovered values:\n${discoveredValuesPayload}\n\nValue mapping:\n${valueMappingPayload}\n\nExecution plan:\n${plan}`,
            0.0,
        );

        let sql = extractSqlFence(sqlText) ?? sqlText.trim();
        let attempts = 0;
        let lastError: string | undefined;

        while (attempts < MAX_SQL_RETRIES) {
            attempts++;
            const guard = guardReadOnlySelect(sql, SQL_MAX_LIMIT);
            if (!guard.ok) {
                lastError = guard.error;
                this.logger.warn(`SQL guard rejected: ${guard.error}`);
                if (attempts >= MAX_SQL_RETRIES) break;
                sqlText = await this.callSingleUser(
                    model,
                    agent5CorrectionSystem,
                    `User question:\n${userQuestion}\n\nDiscovered values:\n${discoveredValuesPayload}\n\nValue mapping:\n${valueMappingPayload}\n\nPlan:\n${plan}\n\nRejected SQL:\n${sql}\n\nGuard error:\n${guard.error}`,
                    0.0,
                );
                sql = extractSqlFence(sqlText) ?? sqlText.trim();
                continue;
            }

            try {
                const rows = await this.prisma.queryReadOnlySql(guard.sql);
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
            } catch (e) {
                lastError = formatPostgresErrorForAgent(e);
                this.logger.warn(`SQL execution failed (attempt ${attempts}): ${lastError}`);
                if (attempts >= MAX_SQL_RETRIES) break;
                sqlText = await this.callSingleUser(
                    model,
                    agent5CorrectionSystem,
                    `User question:\n${userQuestion}\n\nDiscovered values:\n${discoveredValuesPayload}\n\nValue mapping:\n${valueMappingPayload}\n\nPlan:\n${plan}\n\nFailed SQL:\n${guard.sql}\n\nDatabase error:\n${lastError}`,
                    0.0,
                );
                sql = extractSqlFence(sqlText) ?? sqlText.trim();
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

    private isBudgetOrReplacementQuestion(text: string): boolean {
        const q = text.toLowerCase();
        // French + English keywords.
        return (
            q.includes('budget') ||
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
            (q.includes('cost') && (q.includes('replace') || q.includes('replacement')))
        );
    }

    private isSensitiveRequest(text: string): boolean {
        const q = text.toLowerCase();

        // DB schema / structure requests (sensitive internal details)
        if (q.includes('schema') || q.includes('schemas') || q.includes('prisma') || q.includes('database schema')) {
            return true;
        }
        if (q.includes('table ') || q.includes('tables') || q.includes('column') || q.includes('columns') || q.includes('field') || q.includes('fields')) {
            return true;
        }

        // Passwords / credentials / secrets
        if (q.includes('password') || q.includes('mdp') || q.includes('mot de passe') || q.includes('mot-de-passe')) {
            return true;
        }
        if (q.includes('hashed') || q.includes('refresh token') || q.includes('hashedrefreshtoken')) {
            return true;
        }
        if (q.includes('api key') || q.includes('secret') || q.includes('credential') || q.includes('credentials')) {
            return true;
        }

        // Env / config secrets
        if (q.includes('env') || q.includes('.env') || q.includes('database_url') || q.includes('authorization')) {
            return true;
        }

        return false;
    }

    private async summarizeDataAnswer(
        model: string,
        userQuestion: string,
        plan: string,
        sql: string,
        data: unknown,
    ): Promise<string> {
        const preview = JSON.stringify(data).slice(0, 3500);
        const system = `You summarize query results for the user. Be brief, natural language, same language as the user's question when obvious. Do not repeat raw JSON; highlight counts or key facts.`;
        const user = `Question: ${userQuestion}\n\nPlan (reference):\n${plan.slice(0, 2000)}\n\nResult preview:\n${preview}`;
        return this.callSingleUser(model, system, user, 0.2);
    }

    private async discoverDistinctValues(
        filteredModels: Record<string, { table: string; fields: Record<string, string> }>,
    ): Promise<Record<string, Record<string, string[]>>> {
        const out: Record<string, Record<string, string[]>> = {};
        for (const [, model] of Object.entries(filteredModels)) {
            const table = model.table;
            const columns = Object.entries(model.fields)
                .filter(([, desc]) => /Status|Type|Role|\|/i.test(desc))
                .map(([field]) => field);
            if (columns.length === 0) continue;
            out[table] = {};
            for (const col of columns) {
                try {
                    const rows = await this.prisma.queryReadOnlySql(
                        `SELECT DISTINCT "${col}"::text AS value FROM "${table}" WHERE "${col}" IS NOT NULL ORDER BY 1 LIMIT 50`,
                    );
                    out[table][col] = rows
                        .map((r) => (typeof r.value === 'string' ? r.value : String(r.value)))
                        .filter((v) => v.length > 0);
                } catch (e) {
                    this.logger.warn(
                        `Value discovery failed for ${table}.${col}: ${e instanceof Error ? e.message : String(e)}`,
                    );
                }
            }
            if (Object.keys(out[table]).length === 0) delete out[table];
        }
        return out;
    }

    private async jsonModelText(model: string, system: string, user: string, temperature: number): Promise<string> {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ];
        const completion = await this.openai!.chat.completions.create({
            model,
            messages,
            temperature,
            response_format: { type: 'json_object' },
        });
        return completion.choices[0]?.message?.content?.trim() ?? '{}';
    }

    private async callSingleUser(model: string, system: string, user: string, temperature: number): Promise<string> {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ];
        const completion = await this.openai!.chat.completions.create({
            model,
            messages,
            temperature,
        });
        return completion.choices[0]?.message?.content?.trim() ?? '';
    }

    private async callLLM(
        model: string,
        systemPrompt: string,
        turns: { role: 'user' | 'assistant'; content: string }[],
        temperature: number,
    ): Promise<string> {
        const cleanedSystemPrompt = systemPrompt.trim();
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
        if (cleanedSystemPrompt.length > 0) {
            messages.push({ role: 'system', content: cleanedSystemPrompt });
        }
        messages.push(
            ...turns.map(
                (t) => ({ role: t.role, content: t.content }) as OpenAI.Chat.Completions.ChatCompletionMessageParam,
            ),
        );
        const completion = await this.openai!.chat.completions.create({
            model,
            messages,
            temperature,
        });
        return completion.choices[0]?.message?.content?.trim() ?? '';
    }
}

function formatPostgresErrorForAgent(e: unknown): string {
    if (e && typeof e === 'object') {
        const o = e as { message?: string; code?: string; detail?: string; hint?: string };
        const parts = [o.code, o.message, o.detail, o.hint].filter(
            (x): x is string => typeof x === 'string' && x.length > 0,
        );
        if (parts.length > 0) return parts.join(' | ');
    }
    if (e instanceof Error) return e.message;
    return String(e);
}

function parseLinkingJson(raw: string): { models: string[]; rationale?: string } {
    try {
        const o = JSON.parse(raw) as { models?: unknown; relevantModels?: unknown; rationale?: string };
        const arr = o.models ?? o.relevantModels;
        const models = Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
        return { models, rationale: typeof o.rationale === 'string' ? o.rationale : undefined };
    } catch {
        return { models: [] };
    }
}

function parseJsonSafe(raw: string): unknown {
    try {
        return JSON.parse(raw);
    } catch {
        return undefined;
    }
}

function serializeQueryResult(data: unknown): unknown {
    return JSON.parse(
        JSON.stringify(data, (_key, value) => {
            if (typeof value === 'bigint') return value.toString();
            if (value instanceof Date) return value.toISOString();
            if (value && typeof value === 'object' && value.constructor?.name === 'Decimal') {
                return String(value);
            }
            return value;
        }),
    );
}
