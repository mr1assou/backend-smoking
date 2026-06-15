import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { ChatService } from './chat.service';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { OpenThreadDto } from './dto/open-thread.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { CHAT_MESSAGES_PAGE_SIZE } from './lib/chat-pagination';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtGuard)
  @Get('threads')
  listThreads(@Req() req: Request & { user: { userId: number } }) {
    return this.chatService.listThreads(req.user.userId);
  }

  @UseGuards(JwtGuard)
  @Post('threads')
  openThread(
    @Req() req: Request & { user: { userId: number } },
    @Body() dto: OpenThreadDto,
  ) {
    return this.chatService.openThread(req.user.userId, dto.peer_user_id);
  }

  @UseGuards(JwtGuard)
  @Get('threads/:threadId/messages')
  listMessages(
    @Req() req: Request & { user: { userId: number } },
    @Param('threadId', ParseIntPipe) threadId: number,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.chatService.listMessages(
      req.user.userId,
      threadId,
      query.before,
      query.limit ?? CHAT_MESSAGES_PAGE_SIZE,
    );
  }

  @UseGuards(JwtGuard)
  @Post('threads/:threadId/messages')
  sendMessage(
    @Req() req: Request & { user: { userId: number } },
    @Param('threadId', ParseIntPipe) threadId: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(req.user.userId, threadId, dto);
  }

  @UseGuards(JwtGuard)
  @Post('threads/:threadId/read')
  markRead(
    @Req() req: Request & { user: { userId: number } },
    @Param('threadId', ParseIntPipe) threadId: number,
  ) {
    return this.chatService.markSeen(req.user.userId, threadId);
  }
}
