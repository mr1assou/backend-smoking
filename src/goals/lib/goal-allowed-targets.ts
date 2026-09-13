import {
  minDaysAheadFromStreakDays,
  maxDaysAheadFromStreakDays,
} from '../../common/smoke-free-days';
import type { GoalType } from '../goals.constants';

export type GoalProgressSnapshot = {
  moneySaved: number;
  smokeFreeDays: number;
  /** Ceil of elapsed streak in day units (1d 23h → 2). */
  smokeFreeDaysInProgress: number;
  cigarettesAvoided: number;
  elapsedSmokeFreeMs: number;
};

function computeMinTarget(
  type: GoalType,
  progress: GoalProgressSnapshot,
): number {
  switch (type) {
    case 'smoke_free_days':
      return minDaysAheadFromStreakDays(progress.smokeFreeDays);
    case 'cigarettes_avoided':
      return Math.max(1, Math.floor(progress.cigarettesAvoided) + 1);
  }
}

function computeMaxTarget(
  type: GoalType,
  progress: GoalProgressSnapshot,
): number | null {
  switch (type) {
    case 'smoke_free_days':
      return maxDaysAheadFromStreakDays(progress.smokeFreeDays);
    case 'cigarettes_avoided':
      return null;
  }
}

export function computeAllMinTargets(
  progress: GoalProgressSnapshot,
): Record<GoalType, number> {
  return {
    smoke_free_days: computeMinTarget('smoke_free_days', progress),
    cigarettes_avoided: computeMinTarget('cigarettes_avoided', progress),
  };
}

export function computeAllMaxTargets(
  progress: GoalProgressSnapshot,
): Record<GoalType, number | null> {
  return {
    smoke_free_days: computeMaxTarget('smoke_free_days', progress),
    cigarettes_avoided: computeMaxTarget('cigarettes_avoided', progress),
  };
}

export function isAllowedTarget(
  type: GoalType,
  target: number,
  progress: GoalProgressSnapshot,
): boolean {
  if (!Number.isFinite(target) || target <= 0) return false;
  if (!Number.isInteger(target)) return false;

  const minTarget = computeMinTarget(type, progress);
  if (target < minTarget) return false;

  const maxTarget = computeMaxTarget(type, progress);
  if (maxTarget != null && target > maxTarget) return false;

  return true;
}
