import { Injectable, NotFoundException } from '@nestjs/common';
import { AttemptsService } from '../attempts/attempts.service';
import { smokeFreeDaysFromInstant } from '../common/smoke-free-days';
import { utcInstantNow } from '../common/utc-instant';
import { FreedomPointsRepository } from './freedom-points.repository';
import { FREEDOM_POINT_SOURCES } from './lib/freedom-points.constants';
import { buildSmokeFreeDayRewards } from './lib/smoke-free-day-rewards';

export type SyncSmokeFreeDayRewardsResult = {
  /** Number of new ledger rows created this sync. */
  newEntries: number;
  /** FP added to the user this sync. */
  pointsAwarded: number;
  /** Current cached total on `users.freedom_points`. */
  totalFreedomPoints: number;
};

@Injectable()
export class FreedomPointsService {
  constructor(
    private readonly freedomPointsRepository: FreedomPointsRepository,
    private readonly attemptsService: AttemptsService,
  ) {}

  /**
   * Awards +10 FP for each completed 24h smoke-free period not yet recorded
   * for the user's active quit attempt. Safe to call on every session load.
   */
  async syncSmokeFreeDayRewards(
    userId: number,
  ): Promise<SyncSmokeFreeDayRewardsResult> {
    const user =
      await this.freedomPointsRepository.findUserStreakContext(userId);
    if (!user) throw new NotFoundException('User not found');

    const activeAttempt = await this.attemptsService.getActiveAttempt(userId);
    if (!activeAttempt) {
      return {
        newEntries: 0,
        pointsAwarded: 0,
        totalFreedomPoints: user.freedomPoints,
      };
    }

    const now = utcInstantNow();
    const completedDays = smokeFreeDaysFromInstant(
      user.streakStart,
      user.quitDate,
      now,
    );

    await this.freedomPointsRepository.reconcileSmokeFreeDayLedger(
      userId,
      activeAttempt.attempt_id,
      completedDays,
    );

    const existingKeys =
      await this.freedomPointsRepository.findSmokeFreeDaySourceKeysForAttempt(
        userId,
        activeAttempt.attempt_id,
      );

    const pending = buildSmokeFreeDayRewards(
      {
        attemptId: activeAttempt.attempt_id,
        streakStart: user.streakStart,
        quitDate: user.quitDate,
        now,
      },
      new Set(existingKeys),
    );

    let pointsAwarded = 0;
    let newEntries = 0;

    if (pending.length > 0) {
      const grant = await this.freedomPointsRepository.grantMany(
        pending.map((reward) => ({
          userId,
          amount: reward.amount,
          sourceType: FREEDOM_POINT_SOURCES.SMOKE_FREE_DAY,
          sourceKey: reward.sourceKey,
        })),
      );
      pointsAwarded = grant.pointsAwarded;
      newEntries = grant.entriesCreated;
    }

    const totalFreedomPoints =
      await this.freedomPointsRepository.recalculateUserFreedomPoints(userId);

    return {
      newEntries,
      pointsAwarded,
      totalFreedomPoints,
    };
  }

  /** Idempotent one-time grant (e.g. goal completion bonus). */
  async grantOneTimeBonus(input: {
    userId: number;
    amount: number;
    sourceType: string;
    sourceKey: string;
  }): Promise<{ pointsAwarded: number; totalFreedomPoints: number }> {
    const grant = await this.freedomPointsRepository.grantMany([
      {
        userId: input.userId,
        amount: input.amount,
        sourceType: input.sourceType,
        sourceKey: input.sourceKey,
      },
    ]);

    if (grant.pointsAwarded > 0) {
      const totalFreedomPoints =
        await this.freedomPointsRepository.recalculateUserFreedomPoints(
          input.userId,
        );
      return { pointsAwarded: grant.pointsAwarded, totalFreedomPoints };
    }

    const user =
      await this.freedomPointsRepository.findUserStreakContext(input.userId);

    return {
      pointsAwarded: 0,
      totalFreedomPoints: user?.freedomPoints ?? 0,
    };
  }
}
