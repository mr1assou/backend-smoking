import type { FeedPostResponse } from './feed-post';

export type FeedPageResponse = {
  items: FeedPostResponse[];
  has_more: boolean;
};
