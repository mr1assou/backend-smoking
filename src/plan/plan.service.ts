import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanDayProgress } from '@prisma/client';
import { UsersRepository } from '../users/users.repository';
import { areAllPlanTasksDone } from './lib/plan-catalog';
import {
  getCurrentPlanDay,
  getUnlockedThroughDay,
  isPlanDayUnlocked,
  PLAN_TOTAL_DAYS,
} from './lib/plan-unlock';
import { PlanRepository } from './plan.repository';
import type { PlanDayProgressDto, PlanStateResponse } from './types/plan-state.response';

@Injectable()
export class PlanService {
  constructor(
    private readonly planRepository: PlanRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async getPlanState(userId: number, timezone: string): Promise<PlanStateResponse> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const streakStart = user.streakStart ?? user.quitDate ?? null;
    const now = new Date();

    if (!streakStart) {
      return {
        streakStart: null,
        currentDay: 0,
        unlockedThroughDay: 0,
        totalDays: PLAN_TOTAL_DAYS,
        days: [],
      };
    }

    const rows = await this.planRepository.findProgressForUser(userId);
    const completedPlanDays = new Set(
      rows.filter((row) => row.completed_at).map((row) => row.plan_day),
    );
    const unlockedThroughDay = getUnlockedThroughDay(
      streakStart,
      timezone,
      completedPlanDays,
      now,
    );
    const currentDay = getCurrentPlanDay(unlockedThroughDay, completedPlanDays);

    return {
      streakStart: streakStart?.toISOString() ?? null,
      currentDay,
      unlockedThroughDay,
      totalDays: PLAN_TOTAL_DAYS,
      days: rows.map((row) => this.toDayDto(row)),
    };
  }

  async toggleTask(
    userId: number,
    planDay: number,
    taskId: string,
    done: boolean,
    timezone: string,
  ): Promise<PlanStateResponse> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const streakStart = user.streakStart ?? user.quitDate ?? null;
    if (!streakStart) {
      throw new BadRequestException('Plan is not available without a streak start');
    }

    const now = new Date();
    const rows = await this.planRepository.findProgressForUser(userId);
    const completedPlanDays = new Set(
      rows.filter((row) => row.completed_at).map((row) => row.plan_day),
    );
    const unlockedThroughDay = getUnlockedThroughDay(
      streakStart,
      timezone,
      completedPlanDays,
      now,
    );
    const currentDay = getCurrentPlanDay(unlockedThroughDay, completedPlanDays);

    if (!isPlanDayUnlocked(planDay, streakStart, timezone, completedPlanDays, now)) {
      throw new ForbiddenException('This plan day is not unlocked yet');
    }

    if (planDay !== currentDay) {
      throw new ForbiddenException('Tasks can only be updated on your current plan day');
    }

    const existing = await this.planRepository.findDayProgress(userId, planDay);
    const taskStates = this.readTaskStates(existing);
    const nextTaskStates = { ...taskStates, [taskId]: done };
    const completedAt = areAllPlanTasksDone(planDay, nextTaskStates) ? now : null;

    await this.planRepository.upsertDayProgress(
      userId,
      planDay,
      nextTaskStates,
      completedAt,
    );

    return this.getPlanState(userId, timezone);
  }

  private readTaskStates(row: PlanDayProgress | null): Record<string, boolean> {
    if (!row?.task_states || typeof row.task_states !== 'object') return {};
    return row.task_states as Record<string, boolean>;
  }

  private toDayDto(row: PlanDayProgress): PlanDayProgressDto {
    return {
      planDay: row.plan_day,
      taskStates: this.readTaskStates(row),
      completedAt: row.completed_at?.toISOString() ?? null,
    };
  }
}
