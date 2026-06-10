export const SLIP_OUTCOMES = ['lapse', 'relapse'] as const;
export type SlipOutcome = (typeof SLIP_OUTCOMES)[number];
