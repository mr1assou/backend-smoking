/** Whole smoke-free days since `streakStart` (falls back to `quitDate`). */
export const MS_PER_SMOKE_FREE_DAY = 86_400_000;

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

/** Goal must be at least two full days ahead of completed streak days. */
export function minSmokeFreeDayGoalTarget(
  streakStart: Date | null | undefined,
  quitDate: Date | null | undefined,
  now = new Date(),
): number {
  return smokeFreeDaysFromInstant(streakStart, quitDate, now) + 2;
}
