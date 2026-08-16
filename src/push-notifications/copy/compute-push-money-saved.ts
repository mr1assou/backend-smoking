import {
  computeSegmentedAttemptImpact,
  type EconomicsSegment,
  type SlipEventSlice,
} from '../../stats/lib/segmented-attempt-impact';
import { parsePackPrice } from '../../stats/lib/attempt-impact';

export type PushMoneyContext = {
  startedAt: Date;
  segments: EconomicsSegment[];
  slipEvents: SlipEventSlice[];
};

type MoneyRecipient = {
  cigarettesPerDay: number | null;
  cigarettesPerPack: number | null;
  packPrice: string | null;
  streakStart: Date | null;
  quitDate: Date | null;
};

function fallbackSegment(
  recipient: MoneyRecipient,
  startedAt: Date,
): EconomicsSegment {
  return {
    effectiveFrom: startedAt,
    cigarettesPerDay: recipient.cigarettesPerDay ?? 0,
    cigarettesPerPack: recipient.cigarettesPerPack ?? 20,
    packPrice: parsePackPrice(recipient.packPrice),
  };
}

/** Money saved for the current streak, using frozen habit segments when present. */
export function computePushMoneySaved(
  recipient: MoneyRecipient,
  elapsedMs: number,
  now: Date,
  context?: PushMoneyContext,
): number {
  const startedAt =
    context?.startedAt ?? recipient.streakStart ?? recipient.quitDate ?? null;

  if (!startedAt || elapsedMs <= 0) return 0;

  const segments =
    context?.segments && context.segments.length > 0
      ? context.segments
      : [fallbackSegment(recipient, startedAt)];

  return computeSegmentedAttemptImpact(
    segments,
    startedAt,
    now,
    context?.slipEvents ?? [],
  ).moneySaved;
}
