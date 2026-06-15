import type { LeaderboardUserRow } from '../types/leaderboard.types';

/** Only onboarded users with a non-empty display name appear on the board. */
export function filterLeaderboardUsers(rows: LeaderboardUserRow[]): LeaderboardUserRow[] {
  return rows.filter((row) => Boolean(row.username?.trim()));
}

export function displayUsername(row: LeaderboardUserRow): string {
  return row.username?.trim() || `User ${row.user_id}`;
}
