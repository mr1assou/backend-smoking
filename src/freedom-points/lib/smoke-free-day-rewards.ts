import {
  MS_PER_SMOKE_FREE_DAY,
  smokeFreeDaysFromInstant,
} from '../../common/smoke-free-days';
import { FP_PER_SMOKE_FREE_DAY } from './freedom-points.constants';
import { smokeFreeDaySourceKey } from './smoke-free-day-source-key';

export type SmokeFreeDayReward = {
  dayIndex: number;
  amount: number;
  sourceKey: string;
  /** Instant the Nth 24h smoke-free period completed (streakStart + N days). */
  earnedAt: Date;
};

export type SmokeFreeDayRewardContext = {
  attemptId: number;
  streakStart: Date | null;
  quitDate: Date | null;
  now?: Date;
};

/** UTC instant when smoke-free day `dayIndex` completed. */
export function smokeFreeDayEarnedAt(
  streakStart: Date,
  dayIndex: number,
): Date {
  return new Date(streakStart.getTime() + dayIndex * MS_PER_SMOKE_FREE_DAY);
}

/** Builds pending smoke-free day rewards for the active quit attempt (idempotent keys). */
export function buildSmokeFreeDayRewards(
  context: SmokeFreeDayRewardContext,
  alreadyGrantedSourceKeys: ReadonlySet<string>,
): SmokeFreeDayReward[] {
  const start = context.streakStart ?? context.quitDate;
  if (!start) return [];

  const completedDays = smokeFreeDaysFromInstant(
    context.streakStart,
    context.quitDate,
    context.now,
  );
  if (completedDays <= 0) return [];

  const rewards: SmokeFreeDayReward[] = [];

  for (let dayIndex = 1; dayIndex <= completedDays; dayIndex += 1) {
    const sourceKey = smokeFreeDaySourceKey(context.attemptId, dayIndex);
    if (alreadyGrantedSourceKeys.has(sourceKey)) continue;

    rewards.push({
      dayIndex,
      amount: FP_PER_SMOKE_FREE_DAY,
      sourceKey,
      earnedAt: smokeFreeDayEarnedAt(start, dayIndex),
    });
  }

  return rewards;
}
