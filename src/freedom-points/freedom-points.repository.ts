import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { toUtcIso } from '../common/utc-instant';
import { PrismaService } from '../prisma/prisma.service';
import type { FreedomPointLedgerRow } from './types/freedom-point-ledger-row';
import { FREEDOM_POINT_SOURCES } from './lib/freedom-points.constants';
import {
  isLegacyTimestampSmokeFreeDayKey,
  parseSmokeFreeDayAttemptKey,
} from './lib/smoke-free-day-source-key';

export type GrantFreedomPointsInput = {
  userId: number;
  amount: number;
  sourceType: string;
  sourceKey: string;
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

  listLedgerForUser(userId: number): Promise<FreedomPointLedgerRow[]> {
    return this.prisma.freedomPointLedger
      .findMany({
        where: { user_id: userId },
        orderBy: { earned_at: 'desc' },
        select: {
          ledger_id: true,
          amount: true,
          source_type: true,
          source_key: true,
          earned_at: true,
        },
      })
      .then((rows) =>
        rows.map((row) => ({
          id: row.ledger_id,
          amount: row.amount,
          sourceType: row.source_type,
          sourceKey: row.source_key,
          earnedAt: toUtcIso(row.earned_at),
        })),
      );
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
