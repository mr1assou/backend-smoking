import type { AttemptEconomicsSegment } from '@prisma/client';
import {
  computeAttemptImpact,
  parsePackPrice,
  type AttemptEconomics,
  type AttemptImpactSnapshot,
} from './attempt-impact';

export type EconomicsSegment = {
  effectiveFrom: Date;
  cigarettesPerDay: number;
  cigarettesPerPack: number;
  packPrice: number;
};

export type SlipEventSlice = {
  loggedAt: Date;
  cigarettesCount: number | null;
};

const EMPTY_IMPACT: AttemptImpactSnapshot = {
  durationSeconds: 0,
  cigarettesAvoided: 0,
  moneySaved: 0,
  lifeMinutesGained: 0,
  slipCigarettesSmoked: 0,
};

export function mapEconomicsSegmentRow(
  row: AttemptEconomicsSegment,
): EconomicsSegment {
  return {
    effectiveFrom: row.effective_from,
    cigarettesPerDay: row.cigarettes_per_day,
    cigarettesPerPack: row.cigarettes_per_pack,
    packPrice: parsePackPrice(row.pack_price),
  };
}

function sumImpact(
  a: AttemptImpactSnapshot,
  b: AttemptImpactSnapshot,
): AttemptImpactSnapshot {
  return {
    durationSeconds: a.durationSeconds + b.durationSeconds,
    cigarettesAvoided: a.cigarettesAvoided + b.cigarettesAvoided,
    moneySaved: a.moneySaved + b.moneySaved,
    lifeMinutesGained: a.lifeMinutesGained + b.lifeMinutesGained,
    slipCigarettesSmoked: a.slipCigarettesSmoked + b.slipCigarettesSmoked,
  };
}

function slipCountInWindow(
  slipEvents: SlipEventSlice[],
  startMs: number,
  endMs: number,
): number {
  return slipEvents
    .filter((event) => {
      const loggedMs = event.loggedAt.getTime();
      return loggedMs >= startMs && loggedMs < endMs;
    })
    .reduce((sum, event) => sum + Math.max(0, event.cigarettesCount ?? 0), 0);
}

/** Sums habit economics across time windows — old segments stay frozen. */
export function computeSegmentedAttemptImpact(
  segments: EconomicsSegment[],
  timelineStart: Date,
  timelineEnd: Date,
  slipEvents: SlipEventSlice[],
): AttemptImpactSnapshot {
  const startMs = timelineStart.getTime();
  const endMs = timelineEnd.getTime();
  if (endMs <= startMs || segments.length === 0) {
    return EMPTY_IMPACT;
  }

  const sorted = [...segments].sort(
    (a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime(),
  );

  let total = EMPTY_IMPACT;

  for (let index = 0; index < sorted.length; index += 1) {
    const segment = sorted[index];
    const segmentStartMs = Math.max(startMs, segment.effectiveFrom.getTime());
    const nextStartMs = sorted[index + 1]?.effectiveFrom.getTime() ?? endMs;
    const segmentEndMs = Math.min(endMs, nextStartMs);

    if (segmentStartMs >= segmentEndMs) continue;

    const economics: AttemptEconomics = {
      cigarettesPerDay: segment.cigarettesPerDay,
      cigarettesPerPack: segment.cigarettesPerPack,
      packPrice: segment.packPrice,
    };

    const slipInSegment = slipCountInWindow(
      slipEvents,
      segmentStartMs,
      segmentEndMs,
    );

    const partial = computeAttemptImpact(
      economics,
      new Date(segmentStartMs),
      new Date(segmentEndMs),
      slipInSegment,
    );

    total = sumImpact(total, partial);
  }

  total.durationSeconds = Math.floor((endMs - startMs) / 1000);
  total.slipCigarettesSmoked = slipCountInWindow(slipEvents, startMs, endMs);

  return total;
}
