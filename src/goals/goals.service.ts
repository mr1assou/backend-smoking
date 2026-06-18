import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserGoal } from '@prisma/client';
import { AttemptsRepository } from '../attempts/attempts.repository';
import { AttemptsService } from '../attempts/attempts.service';
import { BadgesService } from '../badges/badges.service';
import { loadStatsUserContext } from '../stats/lib';
import { UsersRepository } from '../users/users.repository';
import type { GoalType } from './goals.constants';
import { GoalsRepository } from './goals.repository';
import {
  computeAllMinTargets,
  enforcesStrictGoalMinimums,
  isAllowedTarget,
  type GoalProgressSnapshot,
} from './lib/goal-allowed-targets';
import {
  buildGoalProgressSnapshot,
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
  strictMinTargets: boolean;
};

@Injectable()
export class GoalsService {
  constructor(
    private readonly goalsRepository: GoalsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly attemptsRepository: AttemptsRepository,
    private readonly attemptsService: AttemptsService,
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

    const earnedBadgeIds = await this.badgesService.findEarnedBadgeIds(userId);
    const historicalBest =
      await this.goalsRepository.maxHistoricalCigarettesAvoided(userId);

    if (context.active) {
      await this.syncCompletions(context.active.attempt_id, progress);
    }

    const goals = context.active
      ? await this.goalsRepository.findForAttempt(context.active.attempt_id)
      : [];

    return {
      currency: context.currency,
      progress,
      goals: goals.map((goal) => this.toDto(goal)),
      minTargets: computeAllMinTargets(
        progress,
        context.economics,
        earnedBadgeIds,
        historicalBest,
      ),
      strictMinTargets: enforcesStrictGoalMinimums(earnedBadgeIds),
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

    const earnedBadgeIds = await this.badgesService.findEarnedBadgeIds(userId);
    const historicalBest =
      await this.goalsRepository.maxHistoricalCigarettesAvoided(userId);

    if (
      !isAllowedTarget(
        type,
        target,
        progress,
        context.economics,
        earnedBadgeIds,
        historicalBest,
      )
    ) {
      throw new BadRequestException(
        'Target must be at or above the minimum for your current progress',
      );
    }

    await this.goalsRepository.upsertActiveGoal(
      userId,
      activeAttempt.attempt_id,
      type,
      target,
    );

    return this.getGoalsState(userId);
  }

  private async syncCompletions(
    attemptId: number,
    progress: GoalProgressSnapshot,
  ): Promise<void> {
    const activeGoals = await this.goalsRepository.findActiveForAttempt(attemptId);

    await Promise.all(
      activeGoals
        .filter((goal) =>
          isGoalMet(goal.type as GoalType, goal.target, progress),
        )
        .map((goal) => this.goalsRepository.markCompleted(goal.goal_id)),
    );
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
