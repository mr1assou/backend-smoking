import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export type ChatTurn = {
    role: 'user' | 'assistant';
    content: string;
};
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
export declare class AiService {
    private config;
    private prisma;
    private readonly logger;
    private readonly provider;
    private anthropic;
    private openai;
    constructor(config: ConfigService, prisma: PrismaService);
    private getChatModel;
    chatWithHistory(turns: ChatTurn[]): Promise<ChatResult>;
    private classifyIntent;
    private runDataPipeline;
    private isBudgetOrReplacementQuestion;
    private isSensitiveRequest;
    private summarizeDataAnswer;
    private discoverDistinctValues;
    private jsonModelText;
    private callSingleUser;
    private callLLM;
    private anthropicMessages;
    private anthropicCallWithHistory;
}
