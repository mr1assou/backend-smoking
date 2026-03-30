import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';

@Controller('ai')
@UseGuards(JwtGuard)
export class AiController {
    constructor(private readonly aiService: AiService) {}

    @Post('chat')
    @HttpCode(HttpStatus.OK)
    async chat(@Body() dto: ChatDto) {
        return this.aiService.chatWithHistory(dto.messages);
    }
}
