import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { POST_FEED_REDIS_WINDOW_SIZE } from './lib/post-feed-pagination.constants';
import { hottestScore } from './lib/post-hotness-score';
import { POST_FEED_SORTS } from './lib/post-feed-sort.constants';
import type { PostFeedSort } from './lib/post-feed-sort.constants';
import {
  POSTS_FEED_BACKFILL_LOCK,
  feedKey,
  postCardKey,
  userVotesKey,
} from './lib/posts.redis-keys';

export type PostCacheRow = {
  post_id: number;
  author_id: number;
  title: string;
  description: string;
  tag_id: string | null;
  image_url: string | null;
  image_frame: string | null;
  image_crop: unknown;
  upvote_count: number;
  downvote_count: number;
  share_count: number;
  comment_count: number;
  created_at: Date;
  updated_at: Date;
};

export type CachedPostCard = {
  post_id: number;
  author_id: number;
  title: string;
  description: string;
  tag_id: string;
  image_url: string | null;
  image_frame: string | null;
  image_crop: unknown;
  upvote_count: number;
  downvote_count: number;
  share_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class PostsCacheRepository {
  private readonly logger = new Logger(PostsCacheRepository.name);

  constructor(private readonly redis: RedisService) {}

  private client() {
    return this.redis.getClient();
  }

  async isFeedIndexed(): Promise<boolean> {
    return (await this.client().zcard(feedKey('newest'))) > 0;
  }

  async getFeedWindowSize(tagId?: string): Promise<number> {
    return this.client().zcard(feedKey('newest', tagId));
  }

  async isPostCached(postId: number): Promise<boolean> {
    return (await this.client().exists(postCardKey(postId))) === 1;
  }

  async getFeedIds(
    sort: PostFeedSort,
    tagId: string | undefined,
    offset: number,
    limit: number,
  ): Promise<{ ids: number[]; hasMore: boolean }> {
    const key = feedKey(sort, tagId);
    const members = await this.client().zrevrange(key, offset, offset + limit);
    const hasMore = members.length > limit;
    const ids = members.slice(0, limit).map((value) => Number.parseInt(value, 10));
    return { ids: ids.filter((id) => Number.isFinite(id) && id > 0), hasMore };
  }

  async ensureIndexed(backfill: () => Promise<PostCacheRow[]>): Promise<void> {
    if (await this.isFeedIndexed()) return;

    const locked = await this.client().set(
      POSTS_FEED_BACKFILL_LOCK,
      '1',
      'EX',
      120,
      'NX',
    );
    if (!locked) {
      await this.waitForBackfill();
      return;
    }

    try {
      if (await this.isFeedIndexed()) return;
      const posts = await backfill();
      await this.indexPosts(posts);
      this.logger.log(`Indexed ${posts.length} posts into Redis feed caches`);
    } catch (error) {
      this.logger.error('Failed to backfill post feed cache', error);
      throw error;
    } finally {
      await this.client().del(POSTS_FEED_BACKFILL_LOCK);
    }
  }

  async indexPosts(posts: PostCacheRow[]): Promise<void> {
    if (posts.length === 0) return;

    const pipeline = this.client().pipeline();
    for (const post of posts) {
      this.queueIndexPost(pipeline, post);
    }
    await pipeline.exec();
    await this.enforceWindowLimit();
  }

  async indexPost(post: PostCacheRow): Promise<void> {
    const pipeline = this.client().pipeline();
    this.queueIndexPost(pipeline, post);
    await pipeline.exec();
    await this.enforceWindowLimit();
  }

  async updatePostCard(post: PostCacheRow, previousTagId?: string | null): Promise<void> {
    if (!(await this.isPostCached(post.post_id))) return;
    const pipeline = this.client().pipeline();
    pipeline.hset(postCardKey(post.post_id), this.serializeCardFields(post));

    const tagChanged =
      previousTagId !== undefined && previousTagId !== (post.tag_id ?? null);
    if (tagChanged) {
      this.queueRemoveFromTagFeeds(pipeline, post.post_id, previousTagId);
    }

    this.queueFeedMembership(pipeline, post);
    await pipeline.exec();
  }

  async removePost(postId: number, tagId: string | null): Promise<void> {
    const pipeline = this.client().pipeline();
    pipeline.del(postCardKey(postId));

    for (const sort of POST_FEED_SORTS) {
      pipeline.zrem(feedKey(sort), postId);
      if (tagId) pipeline.zrem(feedKey(sort, tagId), postId);
    }

    await pipeline.exec();
  }

  async syncVoteStats(
    postId: number,
    upvoteCount: number,
    downvoteCount: number,
    tagId: string | null,
  ): Promise<void> {
    if (!(await this.isPostCached(postId))) return;

    const hot = hottestScore(upvoteCount, downvoteCount);
    const pipeline = this.client().pipeline();
    pipeline.hset(postCardKey(postId), 'up', String(upvoteCount), 'down', String(downvoteCount));
    pipeline.zadd(feedKey('hottest'), hot, postId);
    if (tagId) pipeline.zadd(feedKey('hottest', tagId), hot, postId);
    await pipeline.exec();
  }

  async syncCommentCount(
    postId: number,
    commentCount: number,
    tagId: string | null,
  ): Promise<void> {
    if (!(await this.isPostCached(postId))) return;

    const pipeline = this.client().pipeline();
    pipeline.hset(postCardKey(postId), 'comments', String(commentCount));
    pipeline.zadd(feedKey('most_commented'), commentCount, postId);
    if (tagId) pipeline.zadd(feedKey('most_commented', tagId), commentCount, postId);
    await pipeline.exec();
  }

  async incrementShareCount(postId: number): Promise<void> {
    if (!(await this.isPostCached(postId))) return;
    await this.client().hincrby(postCardKey(postId), 'shares', 1);
  }

  async setUserVote(
    userId: number,
    postId: number,
    vote: 'up' | 'down' | null,
  ): Promise<void> {
    const key = userVotesKey(userId);
    await this.client().hset(key, String(postId), vote ?? 'none');
  }

  async backfillUserVotes(
    userId: number,
    votes: Array<{ post_id: number; vote: string }>,
    postIds: number[],
  ): Promise<void> {
    if (postIds.length === 0) return;

    const voted = new Map(
      votes
        .filter((row) => row.vote === 'up' || row.vote === 'down')
        .map((row) => [row.post_id, row.vote] as const),
    );

    const pipeline = this.client().pipeline();
    for (const postId of postIds) {
      const vote = voted.get(postId);
      pipeline.hset(userVotesKey(userId), String(postId), vote ?? 'none');
    }
    await pipeline.exec();
  }

  async getUserVotes(
    userId: number,
    postIds: number[],
  ): Promise<Record<number, 'up' | 'down' | null | undefined>> {
    const out: Record<number, 'up' | 'down' | null | undefined> = {};
    if (postIds.length === 0) return out;

    const values = await this.client().hmget(
      userVotesKey(userId),
      ...postIds.map(String),
    );

    postIds.forEach((postId, index) => {
      const vote = values[index];
      if (vote === 'up' || vote === 'down') {
        out[postId] = vote;
        return;
      }
      if (vote === 'none') {
        out[postId] = null;
        return;
      }
      out[postId] = undefined;
    });

    return out;
  }

  async getPostCards(postIds: number[]): Promise<Map<number, CachedPostCard>> {
    const out = new Map<number, CachedPostCard>();
    if (postIds.length === 0) return out;

    const pipeline = this.client().pipeline();
    for (const postId of postIds) {
      pipeline.hgetall(postCardKey(postId));
    }
    const results = await pipeline.exec();

    postIds.forEach((postId, index) => {
      const raw = results?.[index]?.[1];
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
      const card = this.parseCard(postId, raw as Record<string, string>);
      if (card) out.set(postId, card);
    });

    return out;
  }

  private queueIndexPost(
    pipeline: ReturnType<ReturnType<RedisService['getClient']>['pipeline']>,
    post: PostCacheRow,
  ): void {
    pipeline.hset(postCardKey(post.post_id), this.serializeCardFields(post));
    this.queueFeedMembership(pipeline, post);
  }

  private queueFeedMembership(
    pipeline: ReturnType<ReturnType<RedisService['getClient']>['pipeline']>,
    post: PostCacheRow,
  ): void {
    const ts = post.created_at.getTime();
    const hot = hottestScore(post.upvote_count, post.downvote_count);

    pipeline.zadd(feedKey('newest'), ts, post.post_id);
    pipeline.zadd(feedKey('hottest'), hot, post.post_id);
    pipeline.zadd(feedKey('most_commented'), post.comment_count, post.post_id);

    if (post.tag_id) {
      pipeline.zadd(feedKey('newest', post.tag_id), ts, post.post_id);
      pipeline.zadd(feedKey('hottest', post.tag_id), hot, post.post_id);
      pipeline.zadd(feedKey('most_commented', post.tag_id), post.comment_count, post.post_id);
    }
  }

  private queueRemoveFromTagFeeds(
    pipeline: ReturnType<ReturnType<RedisService['getClient']>['pipeline']>,
    postId: number,
    tagId: string | null | undefined,
  ): void {
    if (!tagId) return;
    for (const sort of POST_FEED_SORTS) {
      pipeline.zrem(feedKey(sort, tagId), postId);
    }
  }

  private serializeCardFields(post: PostCacheRow): Record<string, string> {
    return {
      author_id: String(post.author_id),
      title: post.title,
      description: post.description,
      tag_id: post.tag_id ?? '',
      image_url: post.image_url ?? '',
      image_frame: post.image_frame ?? '',
      image_crop: post.image_crop == null ? '' : JSON.stringify(post.image_crop),
      created_at: post.created_at.toISOString(),
      updated_at: post.updated_at.toISOString(),
      up: String(post.upvote_count),
      down: String(post.downvote_count),
      comments: String(post.comment_count),
      shares: String(post.share_count),
    };
  }

  private parseCard(
    postId: number,
    raw: Record<string, string>,
  ): CachedPostCard | null {
    if (!raw.title || !raw.author_id || !raw.created_at) return null;

    const authorId = Number.parseInt(raw.author_id, 10);
    if (!Number.isFinite(authorId)) return null;

    let imageCrop: unknown = null;
    if (raw.image_crop) {
      try {
        imageCrop = JSON.parse(raw.image_crop) as unknown;
      } catch {
        imageCrop = null;
      }
    }

    return {
      post_id: postId,
      author_id: authorId,
      title: raw.title,
      description: raw.description ?? '',
      tag_id: raw.tag_id ?? '',
      image_url: raw.image_url || null,
      image_frame: raw.image_frame || null,
      image_crop: imageCrop,
      upvote_count: Number.parseInt(raw.up ?? '0', 10) || 0,
      downvote_count: Number.parseInt(raw.down ?? '0', 10) || 0,
      share_count: Number.parseInt(raw.shares ?? '0', 10) || 0,
      comment_count: Number.parseInt(raw.comments ?? '0', 10) || 0,
      created_at: raw.created_at,
      updated_at: raw.updated_at ?? raw.created_at,
    };
  }

  private async enforceWindowLimit(): Promise<void> {
    const key = feedKey('newest');
    const count = await this.client().zcard(key);
    if (count <= POST_FEED_REDIS_WINDOW_SIZE) return;

    const excess = count - POST_FEED_REDIS_WINDOW_SIZE;
    const removedIds = await this.client().zrange(key, 0, excess - 1);
    await this.client().zremrangebyrank(key, 0, excess - 1);

    for (const idStr of removedIds) {
      const postId = Number.parseInt(idStr, 10);
      if (Number.isFinite(postId) && postId > 0) {
        await this.evictPost(postId);
      }
    }
  }

  private async evictPost(postId: number): Promise<void> {
    const tagId = await this.client().hget(postCardKey(postId), 'tag_id');
    const pipeline = this.client().pipeline();
    pipeline.del(postCardKey(postId));

    for (const sort of POST_FEED_SORTS) {
      pipeline.zrem(feedKey(sort), postId);
      if (tagId) pipeline.zrem(feedKey(sort, tagId), postId);
    }

    await pipeline.exec();
  }

  private async waitForBackfill(): Promise<void> {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (await this.isFeedIndexed()) return;
      const locked = await this.client().get(POSTS_FEED_BACKFILL_LOCK);
      if (!locked) return;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}
