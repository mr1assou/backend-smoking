import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { SYSTEM_PROMPT } from './prompts/system-prompt';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

@Injectable()
export class AiService {
    private openai: OpenAI | null;

    constructor(private config: ConfigService) {
        const openaiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
        this.openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
        if (!this.openai) {
            console.warn('OPENAI_API_KEY is not configured. POST /ai/chat will fail.');
        }
    }

    async chatWithHistory(turns: ChatTurn[]): Promise<string> {
        if (!this.openai) {
            throw new ServiceUnavailableException(
                'OpenAI is not configured. Set OPENAI_API_KEY in the environment.',
            );
        }
        if (turns.length === 0) {
            throw new BadRequestException('messages must not be empty');
        }
        if (turns[0].role !== 'user') {
            throw new BadRequestException('messages must start with a user turn');
        }
        if (turns[turns.length - 1].role !== 'user') {
            throw new BadRequestException('messages must end with a user turn');
        }
        for (let i = 0; i < turns.length; i++) {
            const want: 'user' | 'assistant' = i % 2 === 0 ? 'user' : 'assistant';
            if (turns[i].role !== want) {
                throw new BadRequestException(
                    'messages must alternate user / assistant, starting with user',
                );
            }
        }

        const model =
            this.config.get<string>('OPENAI_CHAT_MODEL')?.trim() || 'gpt-4o-mini';

        const systemPrompt = SYSTEM_PROMPT.trim();

        const thread = turns.map((t) => ({
            role: t.role,
            content: t.content,
        })) as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
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
}
