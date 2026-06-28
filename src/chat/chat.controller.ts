import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { ChatService } from './chat.service';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { ListSupportUsersQueryDto } from './dto/list-support-users-query.dto';
import { OpenThreadDto } from './dto/open-thread.dto';
import { RecordCallHistoryDto } from './dto/record-call-history.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { CHAT_MESSAGES_PAGE_SIZE } from './lib/chat-pagination';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtGuard)
  @Get('threads')
  listThreads(
    @Req() req: Request & { user: { userId: number } },
    @Query() query: ListSupportUsersQueryDto,
  ) {
    return this.chatService.listThreads(
      req.user.userId,
      query.offset ?? 0,
      query.limit ?? 30,
    );
  }

  @UseGuards(JwtGuard)
  @Get('support/users')
  listSupportUsers(
    @Req() req: Request & { user: { userId: number } },
    @Query() query: ListSupportUsersQueryDto,
  ) {
    return this.chatService.listSupportUsers(
      req.user.userId,
      query.offset ?? 0,
      query.limit ?? 30,
    );
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
  @Patch('threads/:threadId/messages/:messageId')
  editMessage(
    @Req() req: Request & { user: { userId: number } },
    @Param('threadId', ParseIntPipe) threadId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() dto: EditMessageDto,
  ) {
    return this.chatService.editMessage(
      req.user.userId,
      threadId,
      messageId,
      dto,
    );
  }

  @UseGuards(JwtGuard)
  @Delete('threads/:threadId/messages/:messageId')
  deleteMessage(
    @Req() req: Request & { user: { userId: number } },
    @Param('threadId', ParseIntPipe) threadId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
  ) {
    return this.chatService.deleteMessage(req.user.userId, threadId, messageId);
  }

  @UseGuards(JwtGuard)
  @Post('call-history')
  recordCallHistory(
    @Req() req: Request & { user: { userId: number } },
    @Body() dto: RecordCallHistoryDto,
  ) {
    return this.chatService.recordCallHistory(req.user.userId, dto);
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
