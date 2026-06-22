import {
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
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NOTIFICATIONS_PAGE_SIZE } from './lib/notifications-pagination';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtGuard)
  @Get()
  list(
    @Req() req: Request & { user: { userId: number } },
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.list(
      req.user.userId,
      query.offset ?? 0,
      query.limit ?? NOTIFICATIONS_PAGE_SIZE,
    );
  }

  @UseGuards(JwtGuard)
  @Get('unread-count')
  unreadCount(@Req() req: Request & { user: { userId: number } }) {
    return this.notificationsService.unreadCount(req.user.userId);
  }

  @UseGuards(JwtGuard)
  @Post('read')
  markAllRead(@Req() req: Request & { user: { userId: number } }) {
    return this.notificationsService.markAllRead(req.user.userId);
  }

  @UseGuards(JwtGuard)
  @Post(':id/read')
  markRead(
    @Req() req: Request & { user: { userId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.markRead(req.user.userId, id);
  }
}
