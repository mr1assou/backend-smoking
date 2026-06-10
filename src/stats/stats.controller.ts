import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { StatsService } from './stats.service';

@Controller('auth/me')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @UseGuards(JwtGuard)
  @Get('stats')
  getStats(@Req() req: Request & { user: { userId: number } }) {
    return this.statsService.getUserStats(req.user.userId);
  }
}
