export type LeaderboardUserRow = {
  user_id: number;
  username: string | null;
  country: string | null;
  countryFlag: string | null;
  image_url: string | null;
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
  total_users: number;
};
