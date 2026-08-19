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

export function parseSmokeFreeDaySourceKey(
  sourceKey: string,
): { attemptId: number; dayIndex: number } | null {
  if (isLegacyTimestampSmokeFreeDayKey(sourceKey)) return null;

  const [prefix, dayPart] = sourceKey.split(':');
  const attemptId = Number(prefix);
  const dayIndex = Number(dayPart);
  if (!Number.isInteger(attemptId) || attemptId <= 0) return null;
  if (!Number.isInteger(dayIndex) || dayIndex <= 0) return null;

  return { attemptId, dayIndex };
}

export function parseSmokeFreeDayAttemptKey(
  sourceKey: string,
  attemptId: number,
): number | null {
  const parsed = parseSmokeFreeDaySourceKey(sourceKey);
  if (!parsed || parsed.attemptId !== attemptId) return null;
  return parsed.dayIndex;
}
