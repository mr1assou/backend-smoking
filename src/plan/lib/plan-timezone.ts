export const PLAN_UNLOCK_HOUR = 7;

type Ymd = { year: number; month: number; day: number };

function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(
    dtf
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number.parseInt(part.value, 10)]),
  ) as Record<string, number>;

  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute ?? 0,
    parts.second ?? 0,
  );

  return asUtc - date.getTime();
}

export function zonedTimeToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): number {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const offset = getTimezoneOffsetMs(new Date(utcGuess), timeZone);
  return utcGuess - offset;
}

export function getLocalYmd(instant: Date, timeZone: string): Ymd {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number.parseInt(part.value, 10)]),
  ) as Record<string, number>;

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

export function addDaysToYmd(ymd: Ymd, days: number): Ymd {
  const shifted = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function getPlanDayUnlockMs(
  streakStart: Date,
  planDay: number,
  timeZone: string,
): number {
  // Day 1 is available as soon as the quit streak starts; later days unlock at 7 AM local.
  if (planDay === 1) {
    return streakStart.getTime();
  }

  const streakYmd = getLocalYmd(streakStart, timeZone);
  const unlockYmd = addDaysToYmd(streakYmd, planDay - 1);
  return zonedTimeToUtcMs(
    unlockYmd.year,
    unlockYmd.month,
    unlockYmd.day,
    PLAN_UNLOCK_HOUR,
    0,
    timeZone,
  );
}
