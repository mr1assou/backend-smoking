import {
  LEADERBOARD_STATIC_BADGE_ID,
  LEADERBOARD_STATIC_FREEDOM_POINTS,
} from './leaderboard.constants';
import type {
  LeaderboardEntryResponse,
  LeaderboardResponse,
  LeaderboardUserRow,
} from '../types/leaderboard.types';
import { displayUsername } from './leaderboard.filters';

type MapLeaderboardOptions = {
  viewerUserId: number;
  onlineById: Record<number, boolean>;
};

export function mapLeaderboardResponse(
  rows: LeaderboardUserRow[],
  options: MapLeaderboardOptions,
): LeaderboardResponse {
  const items: LeaderboardEntryResponse[] = rows.map((row, index) => ({
    user_id: row.user_id,
    username: displayUsername(row),
    country: row.country,
    country_flag: row.countryFlag,
    image_url: row.image_url,
    rank: index + 1,
    freedom_points: LEADERBOARD_STATIC_FREEDOM_POINTS,
    badge_id: LEADERBOARD_STATIC_BADGE_ID,
    is_online: options.onlineById[row.user_id] === true,
    is_current_user: row.user_id === options.viewerUserId,
  }));

  return {
    items,
    total_users: items.length,
  };
}
