import type { PostVoteValue } from '../dto/vote-post.dto';

export type PostEngagementResponse = {
  post_id: number;
  upvote_count: number;
  downvote_count: number;
  share_count: number;
  comment_count: number;
  my_vote: PostVoteValue | null;
};
