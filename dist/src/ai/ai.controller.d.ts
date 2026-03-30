import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    chat(dto: ChatDto): Promise<{
        reply: string;
    }>;
}
