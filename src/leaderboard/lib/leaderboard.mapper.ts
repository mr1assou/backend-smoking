import { LEADERBOARD_STATIC_BADGE_ID } from './leaderboard.constants';
import type {
  LeaderboardEntryResponse,
  LeaderboardResponse,
  LeaderboardUserRow,
} from '../types/leaderboard.types';
import { displayUsername } from './leaderboard.filters';

type MapEntryOptions = {
  rank: number;
  viewerUserId: number;
  onlineById: Record<number, boolean>;
};

function mapLeaderboardEntry(
  row: LeaderboardUserRow,
  options: MapEntryOptions,
): LeaderboardEntryResponse {
  return {
    user_id: row.user_id,
    username: displayUsername(row),
    country: row.country,
    country_flag: row.countryFlag,
    image_url: row.image_url,
    rank: options.rank,
    freedom_points: row.freedomPoints,
    badge_id: LEADERBOARD_STATIC_BADGE_ID,
    is_online: options.onlineById[row.user_id] === true,
    is_current_user: row.user_id === options.viewerUserId,
  };
}

type MapLeaderboardPageOptions = {
  viewerUserId: number;
  viewerRow: LeaderboardUserRow | null;
  viewerRank: number;
  onlineById: Record<number, boolean>;
  offset: number;
  limit: number;
  totalUsers: number;
  hasMore: boolean;
};

export function mapLeaderboardPage(
  rows: LeaderboardUserRow[],
  options: MapLeaderboardPageOptions,
): LeaderboardResponse {
  const items = rows.map((row, index) =>
    mapLeaderboardEntry(row, {
      rank: options.offset + index + 1,
      viewerUserId: options.viewerUserId,
      onlineById: options.onlineById,
    }),
  );

  const viewer = options.viewerRow
    ? mapLeaderboardEntry(options.viewerRow, {
        rank: options.viewerRank,
        viewerUserId: options.viewerUserId,
        onlineById: options.onlineById,
      })
    : null;

  return {
    items,
    viewer,
    total_users: options.totalUsers,
    has_more: options.hasMore,
    offset: options.offset,
    limit: options.limit,
  };
}
