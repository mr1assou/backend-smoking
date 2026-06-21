import type { GoalType } from '../goals.constants';

export type GoalProgressSnapshot = {
  moneySaved: number;
  smokeFreeDays: number;
  /** Ceil of elapsed streak in day units (1d 23h → 2). */
  smokeFreeDaysInProgress: number;
  cigarettesAvoided: number;
};

function computeMinTarget(type: GoalType, progress: GoalProgressSnapshot): number {
  switch (type) {
    case 'smoke_free_days':
      return progress.smokeFreeDays + 2;
    case 'cigarettes_avoided':
      return Math.max(1, Math.floor(progress.cigarettesAvoided) + 1);
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

export function isAllowedTarget(
  type: GoalType,
  target: number,
  progress: GoalProgressSnapshot,
): boolean {
  if (!Number.isFinite(target) || target <= 0) return false;

  const minTarget = computeMinTarget(type, progress);
  return Number.isInteger(target) && target >= minTarget;
}
