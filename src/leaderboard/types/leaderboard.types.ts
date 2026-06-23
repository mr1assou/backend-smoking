export type LeaderboardUserRow = {
  user_id: number;
  username: string | null;
  country: string | null;
  countryFlag: string | null;
  image_url: string | null;
  freedomPoints: number;
};

export type LeaderboardEntryResponse = {
  user_id: number;
  username: string;
  country: string | null;
  country_flag: string | null;
  image_url: string | null;
  rank: number;
  freedom_points: number;
  badge_id: string;
  is_online: boolean;
  is_current_user: boolean;
};

export type LeaderboardResponse = {
  items: LeaderboardEntryResponse[];
  viewer: LeaderboardEntryResponse | null;
  total_users: number;
  has_more: boolean;
  offset: number;
  limit: number;
};
