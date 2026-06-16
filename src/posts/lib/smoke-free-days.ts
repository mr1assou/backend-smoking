import { smokeFreeDaysFromInstant } from '../../common/smoke-free-days';

/** @deprecated Use smokeFreeDaysFromInstant from common/smoke-free-days. */
export function smokeFreeDaysFromUser(
  streakStart: Date | null | undefined,
  quitDate: Date | null | undefined,
  now = new Date(),
): number {
  return smokeFreeDaysFromInstant(streakStart, quitDate, now);
}
