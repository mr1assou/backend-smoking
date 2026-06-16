import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { ListLeaderboardQueryDto } from './dto/list-leaderboard-query.dto';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @UseGuards(JwtGuard)
  @Get()
  getGlobalLeaderboard(
    @Req() req: Request & { user: { userId: number } },
    @Query() query: ListLeaderboardQueryDto,
  ) {
    return this.leaderboardService.getGlobalLeaderboard(req.user.userId, query);
  }
}
