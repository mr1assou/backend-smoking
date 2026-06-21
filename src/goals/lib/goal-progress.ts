import { smokeFreeDaysFromInstant, smokeFreeDaysInProgressFromInstant } from '../../common/smoke-free-days';
import type { AttemptImpactSnapshot } from '../../stats/lib/attempt-impact';
import type { GoalType } from '../goals.constants';
import type { GoalProgressSnapshot } from './goal-allowed-targets';

export function buildGoalProgressSnapshot(
  streakStart: Date | null | undefined,
  quitDate: Date | null | undefined,
  activeSnapshot: AttemptImpactSnapshot | null,
  now = new Date(),
): GoalProgressSnapshot {
  return {
    moneySaved: activeSnapshot?.moneySaved ?? 0,
    smokeFreeDays: smokeFreeDaysFromInstant(streakStart, quitDate, now),
    smokeFreeDaysInProgress: smokeFreeDaysInProgressFromInstant(
      streakStart,
      quitDate,
      now,
    ),
    cigarettesAvoided: activeSnapshot?.cigarettesAvoided ?? 0,
  };
}

export function currentValueForGoalType(
  type: GoalType,
  progress: GoalProgressSnapshot,
): number {
  switch (type) {
    case 'smoke_free_days':
      return progress.smokeFreeDays;
    case 'cigarettes_avoided':
      return progress.cigarettesAvoided;
  }
}

export function isGoalMet(type: GoalType, target: number, progress: GoalProgressSnapshot): boolean {
  return currentValueForGoalType(type, progress) >= target;
}
