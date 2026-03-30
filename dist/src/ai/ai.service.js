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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = __importDefault(require("openai"));
const system_prompt_1 = require("./prompts/system-prompt");
let AiService = class AiService {
    config;
    openai;
    constructor(config) {
        this.config = config;
        const openaiKey = this.config.get('OPENAI_API_KEY')?.trim();
        this.openai = openaiKey ? new openai_1.default({ apiKey: openaiKey }) : null;
        if (!this.openai) {
            console.warn('OPENAI_API_KEY is not configured. POST /ai/chat will fail.');
        }
    }
    async chatWithHistory(turns) {
        if (!this.openai) {
            throw new common_1.ServiceUnavailableException('OpenAI is not configured. Set OPENAI_API_KEY in the environment.');
        }
        if (turns.length === 0) {
            throw new common_1.BadRequestException('messages must not be empty');
        }
        if (turns[0].role !== 'user') {
            throw new common_1.BadRequestException('messages must start with a user turn');
        }
        if (turns[turns.length - 1].role !== 'user') {
            throw new common_1.BadRequestException('messages must end with a user turn');
        }
        for (let i = 0; i < turns.length; i++) {
            const want = i % 2 === 0 ? 'user' : 'assistant';
            if (turns[i].role !== want) {
                throw new common_1.BadRequestException('messages must alternate user / assistant, starting with user');
            }
        }
        const model = this.config.get('OPENAI_CHAT_MODEL')?.trim() || 'gpt-4o-mini';
        const systemPrompt = (0, system_prompt_1.buildSystemPrompt)().trim();
        const thread = turns.map((t) => ({
            role: t.role,
            content: t.content,
        }));
        const messages = [];
        if (systemPrompt.length > 0) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push(...thread);
        const completion = await this.openai.chat.completions.create({
            model,
            messages,
        });
        const text = completion.choices[0]?.message?.content;
        return typeof text === 'string' ? text : '';
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map