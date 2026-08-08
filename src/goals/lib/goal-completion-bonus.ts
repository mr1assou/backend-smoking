import type { AttemptEconomics } from '../../stats/lib/attempt-impact';
import {
  baselineElapsedMsFromStorage,
  smokeFreeDaysAheadDeadlineMs,
} from '../../common/smoke-free-days';
import type { GoalType } from '../goals.constants';

/** One-time FP when a goal completes. Streak days remain the main FP source (2/day). */
export const GOAL_COMPLETION_BONUS = {
  FP_PER_DAY: 10,
} as const;

function headroomDays(
  type: GoalType,
  target: number,
  baselineProgress: number,
  economics: AttemptEconomics,
): number {
  switch (type) {
    case 'smoke_free_days':
      return Math.max(0, Math.floor(target));
    case 'cigarettes_avoided': {
      const headroom = Math.max(0, target - baselineProgress);
      if (headroom <= 0) return 0;
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

/**
 * Instant the goal was actually met (for ledger / completed_at backdating).
 * Smoke-free goals: streakStart + baseline + target days.
 * Cigarettes avoided: unknown exact cross time → null (caller uses now).
 */
export function computeGoalCompletionEarnedAt(
  type: GoalType,
  target: number,
  baselineProgress: number,
  streakStart: Date | null | undefined,
  quitDate: Date | null | undefined,
  now = new Date(),
): Date | null {
  if (type !== 'smoke_free_days') return null;

  const start = streakStart ?? quitDate;
  if (!start) return null;

  const baselineMs = baselineElapsedMsFromStorage(baselineProgress);
  const deadlineMs = smokeFreeDaysAheadDeadlineMs(baselineMs, target);
  const earnedAt = new Date(start.getTime() + deadlineMs);

  // Never stamp a future date if clocks drift; clamp to grant time.
  return earnedAt.getTime() > now.getTime() ? now : earnedAt;
}
