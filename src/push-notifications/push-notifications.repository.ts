import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  mapEconomicsSegmentRow,
  type EconomicsSegment,
  type SlipEventSlice,
} from '../stats/lib/segmented-attempt-impact';
import type { PushMoneyContext } from './copy/compute-push-money-saved';

export type PushRecipient = {
  token: string;
  userId: number;
  username: string | null;
  streakStart: Date | null;
  quitDate: Date | null;
  cigarettesPerDay: number | null;
  cigarettesPerPack: number | null;
  packPrice: string | null;
  currency: string | null;
  tipsCardIndex: number;
  motivationCardIndex: number;
};

@Injectable()
export class PushNotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listStreakPushRecipients(): Promise<PushRecipient[]> {
    return this.prisma.pushToken
      .findMany({
        select: {
          token: true,
          user: {
            select: {
              user_id: true,
              username: true,
              streakStart: true,
              quitDate: true,
              cigarettesPerDay: true,
              cigarettesPerPack: true,
              packPrice: true,
              currency: true,
              tipsCardIndex: true,
              motivationCardIndex: true,
            },
          },
        },
      })
      .then((rows) =>
        rows.map((row) => ({
          token: row.token,
          userId: row.user.user_id,
          username: row.user.username,
          streakStart: row.user.streakStart,
          quitDate: row.user.quitDate,
          cigarettesPerDay: row.user.cigarettesPerDay,
          cigarettesPerPack: row.user.cigarettesPerPack,
          packPrice: row.user.packPrice,
          currency: row.user.currency,
          tipsCardIndex: row.user.tipsCardIndex,
          motivationCardIndex: row.user.motivationCardIndex,
        })),
      );
  }

  /** Active-attempt habit windows + slips for money-saved push copy. */
  async listMoneyContextByUserId(
    userIds: number[],
    now: Date,
  ): Promise<Map<number, PushMoneyContext>> {
    const result = new Map<number, PushMoneyContext>();
    if (userIds.length === 0) return result;

    const attempts = await this.prisma.quitAttempt.findMany({
      where: { user_id: { in: userIds }, endedAt: null },
      select: {
        user_id: true,
        startedAt: true,
        economicsSegments: {
          orderBy: { effective_from: 'asc' },
        },
      },
    });

    if (attempts.length === 0) return result;

    const slips = await this.prisma.slipEvent.findMany({
      where: {
        user_id: { in: attempts.map((attempt) => attempt.user_id) },
        loggedAt: { lte: now },
      },
      select: {
        user_id: true,
        loggedAt: true,
        cigarettesCount: true,
      },
      orderBy: { loggedAt: 'asc' },
    });

    const slipsByUserId = new Map<number, SlipEventSlice[]>();
    for (const slip of slips) {
      const list = slipsByUserId.get(slip.user_id) ?? [];
      list.push({
        loggedAt: slip.loggedAt,
        cigarettesCount: slip.cigarettesCount,
      });
      slipsByUserId.set(slip.user_id, list);
    }

    for (const attempt of attempts) {
      const startMs = attempt.startedAt.getTime();
      const endMs = now.getTime();
      const segments: EconomicsSegment[] = attempt.economicsSegments.map(
        mapEconomicsSegmentRow,
      );
      const slipEvents = (slipsByUserId.get(attempt.user_id) ?? []).filter(
        (event) => {
          const loggedMs = event.loggedAt.getTime();
          return loggedMs > startMs && loggedMs <= endMs;
        },
      );

      result.set(attempt.user_id, {
        startedAt: attempt.startedAt,
        segments,
        slipEvents,
      });
    }

    return result;
  }

  listPushTokensForUser(userId: number): Promise<string[]> {
    return this.prisma.pushToken
      .findMany({
        where: { user_id: userId },
        select: { token: true },
      })
      .then((rows) => rows.map((row) => row.token));
  }
}
