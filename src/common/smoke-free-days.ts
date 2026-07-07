/** Whole smoke-free days since `streakStart` (falls back to `quitDate`). */
export const MS_PER_SMOKE_FREE_DAY = 86_400_000;

/** Minimum additional smoke-free days the user can commit to (floor). */
export const MIN_SMOKE_FREE_DAYS_AHEAD = 1;

/** Min days-ahead for goals, based on completed streak days on the current attempt. */
export function minDaysAheadFromStreakDays(streakDays: number): number {
  if (streakDays < 3) return 1;
  if (streakDays < 14) return 2;
  if (streakDays < 30) return 3;
  if (streakDays < 40) return 4;
  if (streakDays < 50) return 5;
  return 6;
}

/** Values below this in `baseline_progress` are legacy completed-day counts. */
const BASELINE_LEGACY_DAY_MAX = 1000;

function streakStartInstant(
  streakStart: Date | null | undefined,
  quitDate: Date | null | undefined,
): Date | null {
  const start = streakStart ?? quitDate;
  return start ?? null;
}

export function elapsedSmokeFreeMs(
  streakStart: Date | null | undefined,
  quitDate: Date | null | undefined,
  now = new Date(),
): number {
  const start = streakStartInstant(streakStart, quitDate);
  if (!start) return 0;

  const diffMs = now.getTime() - start.getTime();
  return diffMs > 0 ? diffMs : 0;
}

export function smokeFreeDaysFromInstant(
  streakStart: Date | null | undefined,
  quitDate: Date | null | undefined,
  now = new Date(),
): number {
  return Math.floor(
    elapsedSmokeFreeMs(streakStart, quitDate, now) / MS_PER_SMOKE_FREE_DAY,
  );
}

/** Current streak day in progress (1d 23h → 2). */
export function smokeFreeDaysInProgressFromInstant(
  streakStart: Date | null | undefined,
  quitDate: Date | null | undefined,
  now = new Date(),
): number {
  const elapsedMs = elapsedSmokeFreeMs(streakStart, quitDate, now);
  if (elapsedMs <= 0) return 0;

  return Math.ceil(elapsedMs / MS_PER_SMOKE_FREE_DAY);
}

export function baselineElapsedMsFromStorage(baselineProgress: number): number {
  if (baselineProgress < BASELINE_LEGACY_DAY_MAX) {
    return baselineProgress * MS_PER_SMOKE_FREE_DAY;
  }
  return baselineProgress;
}

export function smokeFreeDaysAheadDeadlineMs(
  baselineElapsedMs: number,
  daysAhead: number,
): number {
  return baselineElapsedMs + daysAhead * MS_PER_SMOKE_FREE_DAY;
}

export function isSmokeFreeDaysAheadGoalMet(
  baselineElapsedMs: number,
  daysAhead: number,
  elapsedMs: number,
): boolean {
  return (
    elapsedMs >= smokeFreeDaysAheadDeadlineMs(baselineElapsedMs, daysAhead)
  );
}

/** Earliest streak duration if the user picks the minimum for their current streak. */
export function minGoalElapsedMs(
  streakStart: Date | null | undefined,
  quitDate: Date | null | undefined,
  now = new Date(),
): number {
  const elapsedMs = elapsedSmokeFreeMs(streakStart, quitDate, now);
  const streakDays = Math.floor(elapsedMs / MS_PER_SMOKE_FREE_DAY);
  const minAhead = minDaysAheadFromStreakDays(streakDays);
  return elapsedMs + minAhead * MS_PER_SMOKE_FREE_DAY;
}
