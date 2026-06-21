import type { AttemptEconomics } from '../../stats/lib/attempt-impact';
import type { GoalType } from '../goals.constants';

/** One-time FP when a goal completes. Streak days remain the main FP source (10/day). */
export const GOAL_COMPLETION_BONUS = {
  FP_PER_DAY: 2,
} as const;

function headroomDays(
  type: GoalType,
  target: number,
  baselineProgress: number,
  economics: AttemptEconomics,
): number {
  const headroom = Math.max(0, target - baselineProgress);
  if (headroom <= 0) return 0;

  switch (type) {
    case 'smoke_free_days':
      return Math.floor(headroom);
    case 'cigarettes_avoided': {
      const perDay = Math.max(0, economics.cigarettesPerDay);
      if (perDay <= 0) return 0;
      return Math.floor(headroom / perDay);
    }
  }
}

export function computeGoalCompletionBonus(
  type: GoalType,
  target: number,
  baselineProgress: number,
  economics: AttemptEconomics,
): number {
  const days = headroomDays(type, target, baselineProgress, economics);
  if (days <= 0) return 0;

  return days * GOAL_COMPLETION_BONUS.FP_PER_DAY;
}
