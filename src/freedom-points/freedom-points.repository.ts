import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { toUtcIso } from '../common/utc-instant';
import { MS_PER_SMOKE_FREE_DAY } from '../common/smoke-free-days';
import { PrismaService } from '../prisma/prisma.service';
import type { FreedomPointLedgerRow } from './types/freedom-point-ledger-row';
import { FREEDOM_POINT_SOURCES } from './lib/freedom-points.constants';
import {
  isLegacyTimestampSmokeFreeDayKey,
  parseSmokeFreeDayAttemptKey,
  parseSmokeFreeDaySourceKey,
} from './lib/smoke-free-day-source-key';

export type GrantFreedomPointsInput = {
  userId: number;
  amount: number;
  sourceType: string;
  sourceKey: string;
  /** When omitted, DB default `now()` is used. */
  earnedAt?: Date;
};

export type UserStreakContext = {
  streakStart: Date | null;
  quitDate: Date | null;
  freedomPoints: number;
};

export type GrantFreedomPointsResult = {
  pointsAwarded: number;
  entriesCreated: number;
};

@Injectable()
export class FreedomPointsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listLedgerForUser(userId: number): Promise<FreedomPointLedgerRow[]> {
    const rows = await this.prisma.freedomPointLedger.findMany({
      where: { user_id: userId },
      orderBy: { earned_at: 'desc' },
      select: {
        ledger_id: true,
        amount: true,
        source_type: true,
        source_key: true,
        earned_at: true,
      },
    });

    const attemptIds = new Set<number>();
    const goalIds: number[] = [];

    for (const row of rows) {
      if (row.source_type === FREEDOM_POINT_SOURCES.SMOKE_FREE_DAY) {
        const parsed = parseSmokeFreeDaySourceKey(row.source_key);
        if (parsed) attemptIds.add(parsed.attemptId);
        continue;
      }

      if (row.source_type === FREEDOM_POINT_SOURCES.GOAL_COMPLETION) {
        const goalId = Number(row.source_key);
        if (Number.isInteger(goalId) && goalId > 0) goalIds.push(goalId);
      }
    }

    const goalAttemptById = new Map<number, number>();
    if (goalIds.length > 0) {
      const goals = await this.prisma.userGoal.findMany({
        where: { user_id: userId, goal_id: { in: goalIds } },
        select: { goal_id: true, attempt_id: true },
      });
      for (const goal of goals) {
        goalAttemptById.set(goal.goal_id, goal.attempt_id);
        attemptIds.add(goal.attempt_id);
      }
    }

    const attemptNumberById = new Map<number, number>();
    if (attemptIds.size > 0) {
      const attempts = await this.prisma.quitAttempt.findMany({
        where: { user_id: userId, attempt_id: { in: [...attemptIds] } },
        select: { attempt_id: true, attemptNumber: true },
      });
      for (const attempt of attempts) {
        attemptNumberById.set(attempt.attempt_id, attempt.attemptNumber);
      }
    }

    return rows.map((row) => {
      let attemptId: number | null = null;

      if (row.source_type === FREEDOM_POINT_SOURCES.SMOKE_FREE_DAY) {
        attemptId = parseSmokeFreeDaySourceKey(row.source_key)?.attemptId ?? null;
      } else if (row.source_type === FREEDOM_POINT_SOURCES.GOAL_COMPLETION) {
        const goalId = Number(row.source_key);
        attemptId = goalAttemptById.get(goalId) ?? null;
      }

      return {
        id: row.ledger_id,
        amount: row.amount,
        sourceType: row.source_type,
        sourceKey: row.source_key,
        earnedAt: toUtcIso(row.earned_at),
        attemptId,
        attemptNumber: attemptId
          ? (attemptNumberById.get(attemptId) ?? null)
          : null,
      };
    });
  }

  findUserStreakContext(userId: number): Promise<UserStreakContext | null> {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        streakStart: true,
        quitDate: true,
        freedomPoints: true,
      },
    });
  }

  findSmokeFreeDaySourceKeysForAttempt(
    userId: number,
    attemptId: number,
  ): Promise<string[]> {
    const prefix = `${attemptId}:`;

    return this.prisma.freedomPointLedger
      .findMany({
        where: {
          user_id: userId,
          source_type: FREEDOM_POINT_SOURCES.SMOKE_FREE_DAY,
          source_key: { startsWith: prefix },
        },
        select: { source_key: true },
      })
      .then((rows) => rows.map((row) => row.source_key));
  }

  /** Drops legacy timestamp keys and over-credited days for the active attempt. */
  async reconcileSmokeFreeDayLedger(
    userId: number,
    attemptId: number,
    completedDays: number,
  ): Promise<number> {
    const entries = await this.prisma.freedomPointLedger.findMany({
      where: {
        user_id: userId,
        source_type: FREEDOM_POINT_SOURCES.SMOKE_FREE_DAY,
      },
      select: { ledger_id: true, source_key: true },
    });

    const staleIds: number[] = [];

    for (const entry of entries) {
      if (isLegacyTimestampSmokeFreeDayKey(entry.source_key)) {
        staleIds.push(entry.ledger_id);
        continue;
      }

      const dayIndex = parseSmokeFreeDayAttemptKey(entry.source_key, attemptId);
      if (dayIndex !== null && dayIndex > completedDays) {
        staleIds.push(entry.ledger_id);
      }
    }

    if (staleIds.length === 0) return 0;

    await this.prisma.freedomPointLedger.deleteMany({
      where: { ledger_id: { in: staleIds } },
    });

    return staleIds.length;
  }

  /** Align smoke-free day `earned_at` with streakStart + dayIndex (fixes catch-up stamps). */
  async reconcileSmokeFreeDayEarnedAt(
    userId: number,
    attemptId: number,
    streakStart: Date,
  ): Promise<number> {
    const prefix = `${attemptId}:`;
    const entries = await this.prisma.freedomPointLedger.findMany({
      where: {
        user_id: userId,
        source_type: FREEDOM_POINT_SOURCES.SMOKE_FREE_DAY,
        source_key: { startsWith: prefix },
      },
      select: { ledger_id: true, source_key: true, earned_at: true },
    });

    let updated = 0;

    for (const entry of entries) {
      const dayIndex = parseSmokeFreeDayAttemptKey(entry.source_key, attemptId);
      if (dayIndex === null) continue;

      const correctEarnedAt = new Date(
        streakStart.getTime() + dayIndex * MS_PER_SMOKE_FREE_DAY,
      );
      if (entry.earned_at.getTime() === correctEarnedAt.getTime()) continue;

      await this.prisma.freedomPointLedger.update({
        where: { ledger_id: entry.ledger_id },
        data: { earned_at: correctEarnedAt },
      });
      updated += 1;
    }

    return updated;
  }

  async recalculateUserFreedomPoints(userId: number): Promise<number> {
    const total = await this.prisma.freedomPointLedger
      .aggregate({
        where: { user_id: userId },
        _sum: { amount: true },
      })
      .then((result) => result._sum.amount ?? 0);

    await this.prisma.user.update({
      where: { user_id: userId },
      data: { freedomPoints: total },
    });

    return total;
  }

  grantMany(
    entries: GrantFreedomPointsInput[],
  ): Promise<GrantFreedomPointsResult> {
    if (entries.length === 0) {
      return Promise.resolve({ pointsAwarded: 0, entriesCreated: 0 });
    }

    const userId = entries[0].userId;

    return this.prisma.$transaction(async (tx) => {
      let pointsAwarded = 0;
      let entriesCreated = 0;

      for (const entry of entries) {
        try {
          await tx.freedomPointLedger.create({
            data: {
              user_id: entry.userId,
              amount: entry.amount,
              source_type: entry.sourceType,
              source_key: entry.sourceKey,
              ...(entry.earnedAt ? { earned_at: entry.earnedAt } : null),
            },
          });
          pointsAwarded += entry.amount;
          entriesCreated += 1;
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            continue;
          }
          throw error;
        }
      }

      if (pointsAwarded > 0) {
        await tx.user.update({
          where: { user_id: userId },
          data: { freedomPoints: { increment: pointsAwarded } },
        });
      }

      return { pointsAwarded, entriesCreated };
    });
  }
}
