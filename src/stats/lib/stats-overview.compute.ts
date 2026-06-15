import type { AttemptStatsRow, StatsEconomics, StatsImpact } from '../types';
import {
  STATS_FILTER_RANGES,
  type StatsFilterRange,
} from '../types/stats-filter-range';
import type { AttemptEconomics } from './attempt-impact';

const MS_PER_DAY = 86_400_000;
const LIFE_MINUTES_PER_CIG = 20;

const EMPTY_IMPACT: StatsImpact = {
  durationSeconds: 0,
  cigarettesAvoided: 0,
  moneySaved: 0,
  lifeMinutesGained: 0,
  slipCigarettesSmoked: 0,
};

function windowStartMs(range: StatsFilterRange, now: number): number | null {
  if (range === 'lifetime') return null;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return now - days * MS_PER_DAY;
}

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

function sumImpact(a: StatsImpact, b: StatsImpact): StatsImpact {
  return {
    durationSeconds: a.durationSeconds + b.durationSeconds,
    cigarettesAvoided: a.cigarettesAvoided + b.cigarettesAvoided,
    moneySaved: a.moneySaved + b.moneySaved,
    lifeMinutesGained: a.lifeMinutesGained + b.lifeMinutesGained,
    slipCigarettesSmoked: a.slipCigarettesSmoked + b.slipCigarettesSmoked,
  };
}

function attemptImpactFromRow(attempt: AttemptStatsRow): StatsImpact {
  return {
    durationSeconds: attempt.durationSeconds,
    cigarettesAvoided: attempt.cigarettesAvoided,
    moneySaved: attempt.moneySaved,
    lifeMinutesGained: attempt.lifeMinutesGained,
    slipCigarettesSmoked: attempt.slipCigarettesSmoked,
  };
}

function slipCigarettesForSegment(
  attempt: AttemptStatsRow,
  segmentStart: number,
  segmentEnd: number,
  now: number,
): number {
  const attemptStart = Date.parse(attempt.startedAt);
  const attemptEnd = attempt.endedAt ? Date.parse(attempt.endedAt) : now;
  const attemptDuration = Math.max(1, attemptEnd - attemptStart);
  const segmentDuration = Math.max(0, segmentEnd - segmentStart);

  return Math.round(
    attempt.slipCigarettesSmoked * (segmentDuration / attemptDuration),
  );
}

function computeSegmentImpact(
  economics: StatsEconomics,
  segmentStartMs: number,
  segmentEndMs: number,
  slipCigarettes: number,
): StatsImpact {
  const durationMs = Math.max(0, segmentEndMs - segmentStartMs);
  const durationSeconds = Math.floor(durationMs / 1000);
  const gross =
    (Math.max(0, economics.cigarettesPerDay) * durationMs) / MS_PER_DAY;
  const avoided = Math.max(0, Math.floor(gross) - Math.max(0, slipCigarettes));
  const perPack = Math.max(1, economics.cigarettesPerPack);

  return {
    durationSeconds,
    cigarettesAvoided: avoided,
    moneySaved: (avoided / perPack) * economics.packCost,
    lifeMinutesGained: avoided * LIFE_MINUTES_PER_CIG,
    slipCigarettesSmoked: Math.max(0, slipCigarettes),
  };
}

function impactForAttemptSegment(
  attempt: AttemptStatsRow,
  economics: StatsEconomics,
  windowStart: number | null,
  now: number,
): StatsImpact {
  const attemptStart = Date.parse(attempt.startedAt);
  const attemptEnd = attempt.endedAt ? Date.parse(attempt.endedAt) : now;

  if (
    windowStart !== null &&
    !rangesOverlap(windowStart, now, attemptStart, attemptEnd)
  ) {
    return EMPTY_IMPACT;
  }

  const segmentStart =
    windowStart === null ? attemptStart : Math.max(windowStart, attemptStart);
  const segmentEnd = Math.min(now, attemptEnd);

  if (segmentStart >= segmentEnd) return EMPTY_IMPACT;

  const coversFullAttempt =
    segmentStart <= attemptStart && segmentEnd >= attemptEnd;

  if (attempt.endedAt !== null && coversFullAttempt) {
    return attemptImpactFromRow(attempt);
  }

  const slipCigarettes = slipCigarettesForSegment(
    attempt,
    segmentStart,
    segmentEnd,
    now,
  );
  return computeSegmentImpact(
    economics,
    segmentStart,
    segmentEnd,
    slipCigarettes,
  );
}

function computeOverviewForRange(
  attempts: AttemptStatsRow[],
  economics: StatsEconomics,
  range: StatsFilterRange,
  now = Date.now(),
): StatsImpact {
  const windowStart = windowStartMs(range, now);

  return attempts.reduce(
    (total, attempt) =>
      sumImpact(
        total,
        impactForAttemptSegment(attempt, economics, windowStart, now),
      ),
    EMPTY_IMPACT,
  );
}

function toStatsEconomics(economics: AttemptEconomics): StatsEconomics {
  return {
    cigarettesPerDay: economics.cigarettesPerDay,
    cigarettesPerPack: economics.cigarettesPerPack,
    packCost: economics.packPrice,
  };
}

export function computeOverviewByRange(
  attempts: AttemptStatsRow[],
  economics: AttemptEconomics,
  now = Date.now(),
) {
  const statsEconomics = toStatsEconomics(economics);

  return STATS_FILTER_RANGES.reduce(
    (acc, range) => {
      acc[range] = computeOverviewForRange(attempts, statsEconomics, range, now);
      return acc;
    },
    {} as Record<StatsFilterRange, StatsImpact>,
  );
}
