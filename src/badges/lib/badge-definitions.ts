import { FIRST_STEP_BADGE_ID } from './badge.constants';

export type BadgeDefinition = {
  id: string;
  daysRequired: number;
  fpRequired: number;
  premium?: boolean;
};

/** Keep in sync with `quit-smoking/constants/badges.ts`. */
export const BADGE_DEFINITIONS: readonly BadgeDefinition[] = [
  { id: FIRST_STEP_BADGE_ID, daysRequired: 0, fpRequired: 0 },
  { id: 'rising-quitter', daysRequired: 1, fpRequired: 50 },
  { id: 'craving-crusher', daysRequired: 3, fpRequired: 150 },
  { id: 'two-weeks-free', daysRequired: 14, fpRequired: 700 },
  { id: 'top-rated', daysRequired: 30, fpRequired: 1_200 },
  { id: 'top-rated-plus', daysRequired: 60, fpRequired: 2_500 },
  { id: 'champion', daysRequired: 90, fpRequired: 4_000, premium: true },
  { id: 'half-year-hero', daysRequired: 180, fpRequired: 9_000, premium: true },
  { id: 'year-free', daysRequired: 365, fpRequired: 20_000, premium: true },
  { id: 'unstoppable', daysRequired: 500, fpRequired: 28_000, premium: true },
  { id: 'two-year-free', daysRequired: 730, fpRequired: 42_000, premium: true },
  {
    id: 'thousand-day-legend',
    daysRequired: 1000,
    fpRequired: 58_000,
    premium: true,
  },
] as const;

export function isBadgeRequirementsMet(
  badge: BadgeDefinition,
  smokeFreeDays: number,
  freedomPoints: number,
  hasCommittedToQuit: boolean,
): boolean {
  if (badge.id === FIRST_STEP_BADGE_ID) {
    return hasCommittedToQuit;
  }

  return (
    smokeFreeDays >= badge.daysRequired && freedomPoints >= badge.fpRequired
  );
}
