import { FIRST_STEP_BADGE_ID } from './badge.constants';

export type BadgeDefinition = {
  id: string;
  daysRequired: number;
  fpRequired: number;
  goalsCompletedRequired: number;
  premium?: boolean;
};

/** Keep in sync with `quit-smoking/constants/progress/badges.ts`. */
export const BADGE_DEFINITIONS: readonly BadgeDefinition[] = [
  {
    id: FIRST_STEP_BADGE_ID,
    daysRequired: 0,
    fpRequired: 0,
    goalsCompletedRequired: 0,
  },
  {
    id: 'rising-quitter',
    daysRequired: 1,
    fpRequired: 15,
    goalsCompletedRequired: 1,
  },
  {
    id: 'craving-crusher',
    daysRequired: 3,
    fpRequired: 35,
    goalsCompletedRequired: 2,
  },
  {
    id: 'two-weeks-free',
    daysRequired: 14,
    fpRequired: 700,
    goalsCompletedRequired: 4,
  },
  {
    id: 'top-rated',
    daysRequired: 30,
    fpRequired: 1_200,
    goalsCompletedRequired: 6,
  },
  {
    id: 'top-rated-plus',
    daysRequired: 60,
    fpRequired: 2_500,
    goalsCompletedRequired: 8,
  },
  {
    id: 'champion',
    daysRequired: 90,
    fpRequired: 4_000,
    goalsCompletedRequired: 10,
    premium: true,
  },
  {
    id: 'half-year-hero',
    daysRequired: 180,
    fpRequired: 9_000,
    goalsCompletedRequired: 14,
    premium: true,
  },
  {
    id: 'year-free',
    daysRequired: 365,
    fpRequired: 20_000,
    goalsCompletedRequired: 18,
    premium: true,
  },
  {
    id: 'unstoppable',
    daysRequired: 500,
    fpRequired: 28_000,
    goalsCompletedRequired: 22,
    premium: true,
  },
  {
    id: 'two-year-free',
    daysRequired: 730,
    fpRequired: 42_000,
    goalsCompletedRequired: 26,
    premium: true,
  },
  {
    id: 'thousand-day-legend',
    daysRequired: 1000,
    fpRequired: 58_000,
    goalsCompletedRequired: 30,
    premium: true,
  },
] as const;

export function isBadgeRequirementsMet(
  badge: BadgeDefinition,
  smokeFreeDays: number,
  freedomPoints: number,
  goalsCompleted: number,
  hasCommittedToQuit: boolean,
): boolean {
  if (badge.id === FIRST_STEP_BADGE_ID) {
    return hasCommittedToQuit;
  }

  return (
    smokeFreeDays >= badge.daysRequired &&
    freedomPoints >= badge.fpRequired &&
    goalsCompleted >= badge.goalsCompletedRequired
  );
}
