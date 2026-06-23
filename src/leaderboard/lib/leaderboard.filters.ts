import type { LeaderboardUserRow } from '../types/leaderboard.types';
import { DEFAULT_USER_ROLE } from '../../users/lib/user-roles';

/** Onboarded normal-role users with a non-empty display name. */
export const LEADERBOARD_ELIGIBLE_USER_WHERE = {
  AND: [
    { username: { not: null } },
    { NOT: { username: { equals: '' } } },
    { role: DEFAULT_USER_ROLE },
  ],
};

/** Only onboarded users with a non-empty display name appear on the board. */
export function filterLeaderboardUsers(
  rows: LeaderboardUserRow[],
): LeaderboardUserRow[] {
  return rows.filter((row) => Boolean(row.username?.trim()));
}

export function displayUsername(row: LeaderboardUserRow): string {
  return row.username?.trim() || `User ${row.user_id}`;
}
