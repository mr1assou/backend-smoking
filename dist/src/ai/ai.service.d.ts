import { ConfigService } from '@nestjs/config';
export type ChatTurn = {
    role: 'user' | 'assistant';
    content: string;
};
export declare class AiService {
    private config;
    private openai;
    constructor(config: ConfigService);
    chatWithHistory(turns: ChatTurn[]): Promise<string>;
}
