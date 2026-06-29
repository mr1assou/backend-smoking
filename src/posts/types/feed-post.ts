export type FeedPostAuthor = {
  user_id: number;
  username: string | null;
  country: string | null;
  countryFlag: string | null;
  image_url: string | null;
  smoke_free_days: number;
  is_online: boolean;
};

export type FeedPostResponse = {
  post_id: number;
  author_id: number;
  is_mine: boolean;
  is_moderated?: boolean;
  title: string;
  description: string;
  tag_id: string;
  image_url: string | null;
  image_frame: string | null;
  image_crop: unknown;
  media_kind: string | null;
  media_duration_ms: number | null;
  upvote_count: number;
  downvote_count: number;
  share_count: number;
  comment_count: number;
  my_vote: 'up' | 'down' | null;
  created_at: string;
  updated_at: string;
  author: FeedPostAuthor;
};
