import { getPlanDayUnlockMs } from './plan-timezone';

export const PLAN_TOTAL_DAYS = 180;

export function isPlanDayTimeUnlocked(
  planDay: number,
  streakStart: Date | null,
  timeZone: string,
  now: Date,
): boolean {
  if (!streakStart || planDay < 1 || planDay > PLAN_TOTAL_DAYS) return false;
  return now.getTime() >= getPlanDayUnlockMs(streakStart, planDay, timeZone);
}

export function isPlanDayUnlocked(
  planDay: number,
  streakStart: Date | null,
  timeZone: string,
  completedPlanDays: ReadonlySet<number>,
  now: Date,
): boolean {
  if (!isPlanDayTimeUnlocked(planDay, streakStart, timeZone, now)) return false;
  if (planDay === 1) return true;
  return completedPlanDays.has(planDay - 1);
}

export function getUnlockedThroughDay(
  streakStart: Date | null,
  timeZone: string,
  completedPlanDays: ReadonlySet<number>,
  now: Date,
): number {
  let through = 0;
  for (let day = 1; day <= PLAN_TOTAL_DAYS; day += 1) {
    if (
      !isPlanDayUnlocked(day, streakStart, timeZone, completedPlanDays, now)
    ) {
      break;
    }
    through = day;
  }
  return through;
}

/** Active plan day: first unlocked day that is not complete yet. */
export function getCurrentPlanDay(
  unlockedThroughDay: number,
  completedPlanDays: ReadonlySet<number>,
): number {
  if (unlockedThroughDay <= 0) return 0;

  for (let day = 1; day <= unlockedThroughDay; day += 1) {
    if (!completedPlanDays.has(day)) return day;
  }

  return unlockedThroughDay;
}
