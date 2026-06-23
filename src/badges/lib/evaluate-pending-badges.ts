import {
  BADGE_DEFINITIONS,
  type BadgeDefinition,
  isBadgeRequirementsMet,
} from './badge-definitions';
import { FIRST_STEP_BADGE_ID } from './badge.constants';

/**
 * Returns the single next badge the user may earn, or null.
 * Stops at the first unearned tier — never skips ahead.
 */
export function findNextPendingBadgeGrant(
  earnedBadgeIds: ReadonlySet<string>,
  smokeFreeDays: number,
  freedomPoints: number,
  goalsCompleted: number,
  hasCommittedToQuit: boolean,
): string | null {
  for (const badge of BADGE_DEFINITIONS) {
    if (earnedBadgeIds.has(badge.id)) continue;

    if (!hasPriorBadgesEarned(badge, earnedBadgeIds)) {
      return null;
    }

    if (
      isBadgeRequirementsMet(
        badge,
        smokeFreeDays,
        freedomPoints,
        goalsCompleted,
        hasCommittedToQuit,
      )
    ) {
      return badge.id;
    }

    return null;
  }

  return null;
}

function hasPriorBadgesEarned(
  badge: BadgeDefinition,
  earnedBadgeIds: ReadonlySet<string>,
): boolean {
  const index = BADGE_DEFINITIONS.findIndex((entry) => entry.id === badge.id);
  if (index <= 0) return true;

  return BADGE_DEFINITIONS.slice(0, index).every((entry) =>
    earnedBadgeIds.has(entry.id),
  );
}

export function shouldGrantFirstStep(
  earnedBadgeIds: ReadonlySet<string>,
  hasCommittedToQuit: boolean,
): boolean {
  return hasCommittedToQuit && !earnedBadgeIds.has(FIRST_STEP_BADGE_ID);
}
