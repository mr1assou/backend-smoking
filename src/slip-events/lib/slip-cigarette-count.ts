import type { SlipOutcome } from '../types/slip-outcome';

/** A lapse is always exactly one cigarette smoked. */
export const LAPSE_CIGARETTE_COUNT = 1;

/** Relapse is logged with an approximate count — minimum two cigarettes. */
export const RELAPSE_MIN_CIGARETTE_COUNT = 2;

export function resolveSlipCigarettesCount(
  outcome: SlipOutcome,
  cigarettesCount?: number,
): number | undefined {
  if (outcome === 'lapse') {
    return LAPSE_CIGARETTE_COUNT;
  }
  return cigarettesCount;
}
