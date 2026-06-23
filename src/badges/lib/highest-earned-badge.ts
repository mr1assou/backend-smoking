import { BADGE_DEFINITIONS } from './badge-definitions';
import { FIRST_STEP_BADGE_ID } from './badge.constants';

export function highestEarnedBadgeId(
  earnedBadgeIds: readonly string[],
): string {
  const earned = new Set(earnedBadgeIds);
  let highest = FIRST_STEP_BADGE_ID;

  for (const badge of BADGE_DEFINITIONS) {
    if (earned.has(badge.id)) {
      highest = badge.id;
    }
  }

  return highest;
}
