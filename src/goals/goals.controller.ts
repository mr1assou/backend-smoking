import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { SetUserGoalDto } from './dto/set-user-goal.dto';
import { GoalsService } from './goals.service';

@Controller('auth/me/goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @UseGuards(JwtGuard)
  @Get()
  getGoals(@Req() req: Request & { user: { userId: number } }) {
    return this.goalsService.getGoalsState(req.user.userId);
  }

  @UseGuards(JwtGuard)
  @Put()
  setGoal(
    @Req() req: Request & { user: { userId: number } },
    @Body() body: SetUserGoalDto,
  ) {
    return this.goalsService.setGoal(req.user.userId, body.type, body.target);
  }
}
