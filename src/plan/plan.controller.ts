import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { readClientTimezoneHeader } from '../common/client-timezone';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { TogglePlanTaskDto } from './dto/toggle-plan-task.dto';
import { SavePlanTaskNoteDto } from './dto/save-plan-task-note.dto';
import { PlanService } from './plan.service';

@Controller('auth/me/plan')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @UseGuards(JwtGuard)
  @Get()
  getPlan(@Req() req: Request & { user: { userId: number } }) {
    const timezone = readClientTimezoneHeader(req.headers['x-timezone']);
    return this.planService.getPlanState(req.user.userId, timezone);
  }

  @UseGuards(JwtGuard)
  @Patch('days/:day/tasks/:taskId')
  toggleTask(
    @Req() req: Request & { user: { userId: number } },
    @Param('day', ParseIntPipe) day: number,
    @Param('taskId') taskId: string,
    @Body() body: TogglePlanTaskDto,
  ) {
    const timezone = readClientTimezoneHeader(req.headers['x-timezone']);
    return this.planService.toggleTask(
      req.user.userId,
      day,
      taskId,
      body.done,
      timezone,
    );
  }

  @UseGuards(JwtGuard)
  @Patch('days/:day/tasks/:taskId/note')
  saveTaskNote(
    @Req() req: Request & { user: { userId: number } },
    @Param('day', ParseIntPipe) day: number,
    @Param('taskId') taskId: string,
    @Body() body: SavePlanTaskNoteDto,
  ) {
    const timezone = readClientTimezoneHeader(req.headers['x-timezone']);
    return this.planService.saveTaskNote(
      req.user.userId,
      day,
      taskId,
      body.note,
      timezone,
    );
  }
}
