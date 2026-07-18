export type UserProfileCommentPost = {
  post_id: number;
  title: string;
  description: string;
};

export type UserProfileCommentItem = {
  comment_id: number;
  post_id: number;
  text: string;
  created_at: string;
  post: UserProfileCommentPost;
};

export type UserProfileCommentsPage = {
  items: UserProfileCommentItem[];
  has_more: boolean;
};

export type UserStreakResponse = {
  streak_start: string | null;
  attempt_number: number;
  max_duration_ms: number;
  member_since: string;
};

export type UserPresenceResponse = {
  user_id: number;
  is_online: boolean;
  last_offline_at: string | null;
};

export type UserSearchResultItem = {
  user_id: number;
  username: string;
  image_url: string | null;
  country_flag: string | null;
  country: string | null;
  badge_id: string;
  is_online: boolean;
  status: string;
};

export type UserSearchResponse = {
  items: UserSearchResultItem[];
};
