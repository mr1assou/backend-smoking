import {
  elapsedSmokeFreeMs,
  isSmokeFreeDaysAheadGoalMet,
  baselineElapsedMsFromStorage,
  MIN_SMOKE_FREE_DAYS_AHEAD,
  MS_PER_SMOKE_FREE_DAY,
} from '../../common/smoke-free-days';
import type { AttemptImpactSnapshot } from '../../stats/lib/attempt-impact';
import type { GoalType } from '../goals.constants';
import type { GoalProgressSnapshot } from './goal-allowed-targets';

type GoalLike = {
  type: string;
  target: number;
  baseline_progress: number;
};

export function buildGoalProgressSnapshot(
  streakStart: Date | null | undefined,
  quitDate: Date | null | undefined,
  activeSnapshot: AttemptImpactSnapshot | null,
  now = new Date(),
): GoalProgressSnapshot {
  const elapsedMs = elapsedSmokeFreeMs(streakStart, quitDate, now);

  return {
    moneySaved: activeSnapshot?.moneySaved ?? 0,
    smokeFreeDays: Math.floor(elapsedMs / MS_PER_SMOKE_FREE_DAY),
    smokeFreeDaysInProgress:
      elapsedMs <= 0 ? 0 : Math.ceil(elapsedMs / MS_PER_SMOKE_FREE_DAY),
    cigarettesAvoided: activeSnapshot?.cigarettesAvoided ?? 0,
    elapsedSmokeFreeMs: elapsedMs,
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

export function isGoalMet(goal: GoalLike, progress: GoalProgressSnapshot): boolean {
  switch (goal.type) {
    case 'smoke_free_days':
      return isSmokeFreeDaysAheadGoalMet(
        baselineElapsedMsFromStorage(goal.baseline_progress),
        goal.target,
        progress.elapsedSmokeFreeMs,
      );
    case 'cigarettes_avoided':
      return progress.cigarettesAvoided >= goal.target;
    default:
      return false;
  }
}

export { MIN_SMOKE_FREE_DAYS_AHEAD };
