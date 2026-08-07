import { Injectable } from '@nestjs/common';
import { Prisma, UserGoal } from '@prisma/client';
import { utcInstantNow } from '../common/utc-instant';
import { PrismaService } from '../prisma/prisma.service';
import type { GoalType } from './goals.constants';

type Tx = Prisma.TransactionClient;

@Injectable()
export class GoalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveForAttempt(attemptId: number): Promise<UserGoal[]> {
    return this.prisma.userGoal.findMany({
      where: { attempt_id: attemptId, status: 'active' },
      orderBy: { started_at: 'asc' },
    });
  }

  findForAttempt(attemptId: number): Promise<UserGoal[]> {
    return this.prisma.userGoal.findMany({
      where: { attempt_id: attemptId },
      orderBy: { started_at: 'asc' },
    });
  }

  findActiveByAttemptAndType(
    attemptId: number,
    type: GoalType,
  ): Promise<UserGoal | null> {
    return this.prisma.userGoal.findFirst({
      where: { attempt_id: attemptId, type, status: 'active' },
    });
  }

  /**
   * Update the active goal of this type, or insert a new row when none is active.
   * Completed/failed goals are never overwritten — they stay in history with their own ids (and FP keys).
   */
  async createOrUpdateActiveGoal(
    userId: number,
    attemptId: number,
    type: GoalType,
    target: number,
    baselineProgress: number,
  ): Promise<UserGoal> {
    const now = utcInstantNow();
    const active = await this.findActiveByAttemptAndType(attemptId, type);

    if (active) {
      return this.prisma.userGoal.update({
        where: { goal_id: active.goal_id },
        data: {
          target,
          baseline_progress: baselineProgress,
          started_at: now,
          completed_at: null,
          failed_at: null,
          failed_reason: null,
          failed_by_slip_event_id: null,
        },
      });
    }

    return this.prisma.userGoal.create({
      data: {
        user_id: userId,
        attempt_id: attemptId,
        type,
        target,
        baseline_progress: baselineProgress,
        status: 'active',
        started_at: now,
      },
    });
  }

  markCompleted(goalId: number): Promise<UserGoal> {
    return this.prisma.userGoal.update({
      where: { goal_id: goalId },
      data: {
        status: 'completed',
        completed_at: utcInstantNow(),
      },
    });
  }

  failActiveGoalsForAttempt(
    tx: Tx,
    attemptId: number,
    slipEventId: number,
  ): Promise<number> {
    const now = utcInstantNow();

    return tx.userGoal
      .updateMany({
        where: { attempt_id: attemptId, status: 'active' },
        data: {
          status: 'failed',
          failed_at: now,
          failed_reason: 'slip',
          failed_by_slip_event_id: slipEventId,
        },
      })
      .then((result) => result.count);
  }

  restoreGoalsFailedBySlip(tx: Tx, slipEventId: number): Promise<number> {
    return tx.userGoal
      .updateMany({
        where: {
          failed_by_slip_event_id: slipEventId,
          status: 'failed',
        },
        data: {
          status: 'active',
          failed_at: null,
          failed_reason: null,
          failed_by_slip_event_id: null,
        },
      })
      .then((result) => result.count);
  }

  listAllForUser(userId: number) {
    return this.prisma.userGoal.findMany({
      where: { user_id: userId },
      include: {
        attempt: {
          select: { attemptNumber: true },
        },
      },
      orderBy: { started_at: 'desc' },
    });
  }

  findByIdForUser(goalId: number, userId: number): Promise<UserGoal | null> {
    return this.prisma.userGoal.findFirst({
      where: { goal_id: goalId, user_id: userId },
    });
  }

  deleteActiveGoal(userId: number, goalId: number): Promise<boolean> {
    return this.prisma.userGoal
      .deleteMany({
        where: { goal_id: goalId, user_id: userId, status: 'active' },
      })
      .then((result) => result.count > 0);
  }
}
