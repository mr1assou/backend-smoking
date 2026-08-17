import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserGoal } from '@prisma/client';
import { AttemptsRepository } from '../attempts/attempts.repository';
import { AttemptsService } from '../attempts/attempts.service';
import { BadgesService } from '../badges/badges.service';
import { FreedomPointsService } from '../freedom-points/freedom-points.service';
import { FREEDOM_POINT_SOURCES } from '../freedom-points/lib/freedom-points.constants';
import type { AttemptEconomics } from '../stats/lib/attempt-impact';
import { loadStatsUserContext } from '../stats/lib';
import { UsersRepository } from '../users/users.repository';
import type { GoalType } from './goals.constants';
import { GoalsRepository } from './goals.repository';
import {
  computeAllMinTargets,
  computeAllMaxTargets,
  isAllowedTarget,
  type GoalProgressSnapshot,
} from './lib/goal-allowed-targets';
import { computeGoalCompletionBonus, computeGoalCompletionEarnedAt } from './lib/goal-completion-bonus';
import { elapsedSmokeFreeMs } from '../common/smoke-free-days';
import { buildGoalProgressSnapshot, isGoalMet } from './lib/goal-progress';

export type UserGoalDto = {
  id: number;
  attemptId: number;
  type: GoalType;
  target: number;
  baselineProgress: number;
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
  maxTargets: Record<GoalType, number | null>;
};

@Injectable()
export class GoalsService {
  constructor(
    private readonly goalsRepository: GoalsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly attemptsRepository: AttemptsRepository,
    private readonly attemptsService: AttemptsService,
    private readonly freedomPointsService: FreedomPointsService,
    private readonly badgesService: BadgesService,
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
        user.streakStart,
        user.quitDate,
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
      maxTargets: computeAllMaxTargets(progress),
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
      (await this.attemptsService.ensureFirstAttempt(userId, user.quitDate));

    const progress = buildGoalProgressSnapshot(
      user.streakStart,
      user.quitDate,
      context.activeSnapshot,
      context.now,
    );

    if (!isAllowedTarget(type, target, progress)) {
      throw new BadRequestException(
        'Target must be within the allowed range for your current streak',
      );
    }

    const baselineProgress =
      type === 'smoke_free_days'
        ? elapsedSmokeFreeMs(user.streakStart, user.quitDate, context.now)
        : progress.cigarettesAvoided;

    await this.goalsRepository.createOrUpdateActiveGoal(
      userId,
      activeAttempt.attempt_id,
      type,
      target,
      baselineProgress,
    );

    return this.getGoalsState(userId);
  }

  async deleteGoal(
    userId: number,
    goalId: number,
  ): Promise<GoalsStateResponse> {
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
    streakStart: Date | null | undefined,
    quitDate: Date | null | undefined,
  ): Promise<void> {
    const activeGoals =
      await this.goalsRepository.findActiveForAttempt(attemptId);
    const completedGoals = activeGoals.filter((goal) =>
      isGoalMet(goal, progress),
    );

    await Promise.all(
      completedGoals.map((goal) =>
        this.completeGoal(userId, goal, economics, streakStart, quitDate),
      ),
    );
  }

  private async completeGoal(
    userId: number,
    goal: UserGoal,
    economics: AttemptEconomics,
    streakStart: Date | null | undefined,
    quitDate: Date | null | undefined,
  ): Promise<void> {
    const goalType = goal.type as GoalType;
    const earnedAt =
      computeGoalCompletionEarnedAt(
        goalType,
        goal.target,
        goal.baseline_progress,
        streakStart,
        quitDate,
      ) ?? undefined;

    await this.goalsRepository.markCompleted(goal.goal_id, earnedAt);

    const bonus = computeGoalCompletionBonus(
      goalType,
      goal.target,
      goal.baseline_progress,
      economics,
    );

    await this.freedomPointsService.grantOneTimeBonus({
      userId,
      amount: bonus,
      sourceType: FREEDOM_POINT_SOURCES.GOAL_COMPLETION,
      sourceKey: String(goal.goal_id),
      earnedAt,
    });

    await this.badgesService.syncEarnedBadges(userId);
  }

  private toDto(goal: UserGoal): UserGoalDto {
    return {
      id: goal.goal_id,
      attemptId: goal.attempt_id,
      type: goal.type as GoalType,
      target: goal.target,
      baselineProgress: goal.baseline_progress,
      status: goal.status,
      startedAt: goal.started_at.toISOString(),
      completedAt: goal.completed_at?.toISOString() ?? null,
      failedAt: goal.failed_at?.toISOString() ?? null,
    };
  }
}
