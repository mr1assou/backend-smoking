import type { PostFeedSort } from './post-feed-sort.constants';

const PREFIX = 'posts';

export const POSTS_FEED_BACKFILL_LOCK = `${PREFIX}:feed:backfill:lock`;

export function postCardKey(postId: number): string {
  return `${PREFIX}:card:${postId}`;
}

export function feedKey(sort: PostFeedSort, tagId?: string): string {
  if (tagId) return `${PREFIX}:feed:tag:${tagId}:${sort}`;
  return `${PREFIX}:feed:${sort}`;
}

export function userVotesKey(userId: number): string {
  return `${PREFIX}:user:${userId}:votes`;
}
