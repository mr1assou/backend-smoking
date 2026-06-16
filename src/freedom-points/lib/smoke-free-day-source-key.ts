/** Stable ledger key: one row per quit-attempt smoke-free day (survives streakStart edits). */
export function smokeFreeDaySourceKey(
  attemptId: number,
  dayIndex: number,
): string {
  return `${attemptId}:${dayIndex}`;
}

/** Legacy keys used streakStart millis — causes duplicates when streakStart changes. */
export function isLegacyTimestampSmokeFreeDayKey(sourceKey: string): boolean {
  const [prefix] = sourceKey.split(':');
  const value = Number(prefix);
  return Number.isFinite(value) && value > 1_000_000_000_000;
}

export function parseSmokeFreeDayAttemptKey(
  sourceKey: string,
  attemptId: number,
): number | null {
  const [prefix, dayPart] = sourceKey.split(':');
  if (Number(prefix) !== attemptId) return null;

  const dayIndex = Number(dayPart);
  if (!Number.isFinite(dayIndex) || dayIndex <= 0) return null;

  return dayIndex;
}
