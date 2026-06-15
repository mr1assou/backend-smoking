import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { StatsService } from './stats.service';

@Controller('auth/me/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @UseGuards(JwtGuard)
  @Get('overview')
  getOverview(@Req() req: Request & { user: { userId: number } }) {
    return this.statsService.getOverview(req.user.userId);
  }

  @UseGuards(JwtGuard)
  @Get('attempts')
  getAttempts(@Req() req: Request & { user: { userId: number } }) {
    return this.statsService.getAttempts(req.user.userId);
  }
}
