import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { parseOnlineUserIds } from './lib/parse-online-user-ids';
import { PresenceService } from './presence.service';

@Controller('presence')
export class PresenceController {
  constructor(private readonly presence: PresenceService) {}

  /** Explicit offline when the app backgrounds or closes (socket disconnect may not arrive). */
  @UseGuards(JwtGuard)
  @Post('offline')
  async goOffline(@Req() req: Request & { user: { userId: number } }) {
    await this.presence.markOffline(req.user.userId);
    return { ok: true };
  }

  @UseGuards(JwtGuard)
  @Get('online')
  async getOnlineStatus(@Query('ids') idsParam?: string) {
    const ids = parseOnlineUserIds(idsParam);

    if (ids.length === 0) {
      const onlineUserIds = await this.presence.getOnlineUserIds();
      return {
        onlineById: Object.fromEntries(onlineUserIds.map((id) => [id, true])),
      };
    }

    const onlineById = await this.presence.areOnline(ids);
    return { onlineById };
  }
}
