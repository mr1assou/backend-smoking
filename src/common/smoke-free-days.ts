/** Whole smoke-free days since `streakStart` (falls back to `quitDate`). */
export function smokeFreeDaysFromInstant(
  streakStart: Date | null | undefined,
  quitDate: Date | null | undefined,
  now = new Date(),
): number {
  const start = streakStart ?? quitDate;
  if (!start) return 0;

  const diffMs = now.getTime() - start.getTime();
  if (diffMs <= 0) return 0;

  return Math.floor(diffMs / 86_400_000);
}
