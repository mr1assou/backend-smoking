import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserGoal } from '@prisma/client';
import { AttemptsRepository } from '../attempts/attempts.repository';
import { AttemptsService } from '../attempts/attempts.service';
import { FreedomPointsService } from '../freedom-points/freedom-points.service';
import { FREEDOM_POINT_SOURCES } from '../freedom-points/lib/freedom-points.constants';
import type { AttemptEconomics } from '../stats/lib/attempt-impact';
import { loadStatsUserContext } from '../stats/lib';
import { UsersRepository } from '../users/users.repository';
import type { GoalType } from './goals.constants';
import { GoalsRepository } from './goals.repository';
import {
  computeAllMinTargets,
  isAllowedTarget,
  type GoalProgressSnapshot,
} from './lib/goal-allowed-targets';
import { computeGoalCompletionBonus } from './lib/goal-completion-bonus';
import {
  buildGoalProgressSnapshot,
  currentValueForGoalType,
  isGoalMet,
} from './lib/goal-progress';

export type UserGoalDto = {
  id: number;
  attemptId: number;
  type: GoalType;
  target: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
  failedAt: string | null;
};

export type GoalsStateResponse = {
  currency: string;
  progress: GoalProgressSnapshot;
  goals: UserGoalDto[];
  minTargets: Record<GoalType, number>;
};

@Injectable()
export class GoalsService {
  constructor(
    private readonly goalsRepository: GoalsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly attemptsRepository: AttemptsRepository,
    private readonly attemptsService: AttemptsService,
    private readonly freedomPointsService: FreedomPointsService,
  ) {}

  async getGoalsState(userId: number): Promise<GoalsStateResponse> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const context = await loadStatsUserContext(
      userId,
      this.usersRepository,
      this.attemptsRepository,
      this.attemptsService,
    );

    const progress = buildGoalProgressSnapshot(
      user.streakStart,
      user.quitDate,
      context.activeSnapshot,
      context.now,
    );

    if (context.active) {
      await this.syncCompletions(
        userId,
        context.active.attempt_id,
        progress,
        context.economics,
      );
    }

    const goals = context.active
      ? await this.goalsRepository.findForAttempt(context.active.attempt_id)
      : [];

    return {
      currency: context.currency,
      progress,
      goals: goals.map((goal) => this.toDto(goal)),
      minTargets: computeAllMinTargets(progress),
    };
  }

  async setGoal(
    userId: number,
    type: GoalType,
    target: number,
  ): Promise<GoalsStateResponse> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!user.quitDate) {
      throw new BadRequestException('Set a quit date before creating goals');
    }

    const context = await loadStatsUserContext(
      userId,
      this.usersRepository,
      this.attemptsRepository,
      this.attemptsService,
    );

    const activeAttempt =
      context.active ??
      (await this.attemptsService.ensureFirstAttempt(
        userId,
        user.quitDate,
      ));

    const progress = buildGoalProgressSnapshot(
      user.streakStart,
      user.quitDate,
      context.activeSnapshot,
      context.now,
    );

    if (!isAllowedTarget(type, target, progress)) {
      throw new BadRequestException(
        'Target must be at or above the minimum for your current progress',
      );
    }

    await this.goalsRepository.upsertActiveGoal(
      userId,
      activeAttempt.attempt_id,
      type,
      target,
      currentValueForGoalType(type, progress),
    );

    return this.getGoalsState(userId);
  }

  async deleteGoal(userId: number, goalId: number): Promise<GoalsStateResponse> {
    const goal = await this.goalsRepository.findByIdForUser(goalId, userId);
    if (!goal) throw new NotFoundException('Goal not found');

    if (goal.status !== 'active') {
      throw new BadRequestException('Only active goals can be deleted');
    }

    const deleted = await this.goalsRepository.deleteActiveGoal(userId, goalId);
    if (!deleted) throw new NotFoundException('Goal not found');

    return this.getGoalsState(userId);
  }

  private async syncCompletions(
    userId: number,
    attemptId: number,
    progress: GoalProgressSnapshot,
    economics: AttemptEconomics,
  ): Promise<void> {
    const activeGoals = await this.goalsRepository.findActiveForAttempt(attemptId);
    const completedGoals = activeGoals.filter((goal) =>
      isGoalMet(goal.type as GoalType, goal.target, progress),
    );

    await Promise.all(
      completedGoals.map((goal) => this.completeGoal(userId, goal, economics)),
    );
  }

  private async completeGoal(
    userId: number,
    goal: UserGoal,
    economics: AttemptEconomics,
  ): Promise<void> {
    await this.goalsRepository.markCompleted(goal.goal_id);

    const bonus = computeGoalCompletionBonus(
      goal.type as GoalType,
      goal.target,
      goal.baseline_progress,
      economics,
    );

    await this.freedomPointsService.grantOneTimeBonus({
      userId,
      amount: bonus,
      sourceType: FREEDOM_POINT_SOURCES.GOAL_COMPLETION,
      sourceKey: String(goal.goal_id),
    });
  }

  private toDto(goal: UserGoal): UserGoalDto {
    return {
      id: goal.goal_id,
      attemptId: goal.attempt_id,
      type: goal.type as GoalType,
      target: goal.target,
      status: goal.status,
      startedAt: goal.started_at.toISOString(),
      completedAt: goal.completed_at?.toISOString() ?? null,
      failedAt: goal.failed_at?.toISOString() ?? null,
    };
  }
}
