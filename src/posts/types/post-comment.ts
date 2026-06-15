import type { FeedPostAuthor } from './feed-post';

export type PostCommentReplyTo = {
  user_id: number;
  username: string | null;
};

export type PostCommentResponse = {
  comment_id: number;
  post_id: number;
  parent_comment_id: number | null;
  reply_to: PostCommentReplyTo | null;
  is_mine: boolean;
  text: string;
  upvote_count: number;
  downvote_count: number;
  my_vote: 'up' | 'down' | null;
  created_at: string;
  author: FeedPostAuthor;
};

export type PostCommentEngagementResponse = {
  comment_id: number;
  upvote_count: number;
  downvote_count: number;
  my_vote: 'up' | 'down' | null;
};
