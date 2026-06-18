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

  upsertActiveGoal(
    userId: number,
    attemptId: number,
    type: GoalType,
    target: number,
  ): Promise<UserGoal> {
    const now = utcInstantNow();

    return this.prisma.userGoal.upsert({
      where: {
        attempt_id_type: {
          attempt_id: attemptId,
          type,
        },
      },
      create: {
        user_id: userId,
        attempt_id: attemptId,
        type,
        target,
        status: 'active',
        started_at: now,
      },
      update: {
        target,
        status: 'active',
        started_at: now,
        completed_at: null,
        failed_at: null,
        failed_reason: null,
        failed_by_slip_event_id: null,
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

  maxHistoricalCigarettesAvoided(userId: number): Promise<number> {
    return this.prisma.quitAttempt
      .aggregate({
        where: { user_id: userId, endedAt: { not: null } },
        _max: { cigarettesAvoided: true },
      })
      .then((result) => result._max.cigarettesAvoided ?? 0);
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
}
