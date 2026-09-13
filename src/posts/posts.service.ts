import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { BadgesService } from '../badges/badges.service';
import { PresenceService } from '../presence/presence.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PostModerationPushNotificationService } from '../push-notifications/post-moderation-push-notification.service';
import { isSupportRole } from '../users/lib/user-roles';
import type { CreateCommentDto } from './dto/create-comment.dto';
import type { UpdateCommentDto } from './dto/update-comment.dto';
import type { CreatePostDto } from './dto/create-post.dto';
import {
  ListPostsQueryDto,
  resolveFeedPagination,
} from './dto/list-posts-query.dto';
import type { UpdatePostDto } from './dto/update-post.dto';
import type { VotePostDto } from './dto/vote-post.dto';
import { DEFAULT_POST_FEED_SORT } from './lib/post-feed-sort.constants';
import { POST_MEDIA_KINDS } from './lib/post-media.constants';
import { POST_FEED_REDIS_WINDOW_SIZE } from './lib/post-feed-pagination.constants';
import { smokeFreeDaysFromUser } from './lib/smoke-free-days';
import {
  PostsCacheRepository,
  type CachedPostCard,
  type PostCacheRow,
} from './posts-cache.repository';
import { PostsRepository, type FeedPostRow } from './posts.repository';
import type { FeedPostAuthor } from './types/feed-post';
import type { FeedPageResponse } from './types/feed-page';
import type { FeedPostResponse } from './types/feed-post';
import type { PostCommentResponse } from './types/post-comment';
import type { PostEngagementResponse } from './types/post-engagement';

type AuthorRow = {
  user_id: number;
  username: string | null;
  country: string | null;
  countryFlag: string | null;
  streakStart: Date | null;
  quitDate: Date | null;
  image_url: string | null;
};

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private readonly postsRepository: PostsRepository,
    private readonly postsCacheRepository: PostsCacheRepository,
    private readonly storageService: StorageService,
    private readonly presenceService: PresenceService,
    private readonly badgesService: BadgesService,
    private readonly notificationsService: NotificationsService,
    private readonly postModerationPush: PostModerationPushNotificationService,
  ) {}

  async listFeed(
    viewerUserId: number,
    query: ListPostsQueryDto = {},
  ): Promise<FeedPageResponse> {
    await this.badgesService.syncEarnedBadges(viewerUserId);

    const sort = query.sort ?? DEFAULT_POST_FEED_SORT;
    const tagId = query.tag_id;
    const { offset, limit } = resolveFeedPagination(query);

    const canUseRedis =
      sort === 'newest' && offset < POST_FEED_REDIS_WINDOW_SIZE;

    if (canUseRedis) {
      try {
        await this.postsCacheRepository.ensureIndexed(() =>
          this.postsRepository.findAllForCacheIndex(),
        );

        const { ids, hasMore: redisHasMore } =
          await this.postsCacheRepository.getFeedIds(tagId, offset, limit);

        if (ids.length > 0 || offset === 0) {
          const items = await this.buildFeedFromCache(viewerUserId, ids);
          const has_more = await this.resolveNewestHasMore(
            redisHasMore,
            offset,
            items.length,
            tagId,
          );
          return { items, has_more };
        }
      } catch (error) {
        this.logger.warn(
          'Redis feed read failed, falling back to Postgres',
          error,
        );
      }
    }

    const { rows, hasMore } = await this.postsRepository.findFeed(
      viewerUserId,
      {
        sort,
        tagId,
        offset,
        limit,
      },
    );

    return this.buildFeedPageFromRows(rows, viewerUserId, hasMore);
  }

  private async resolveNewestHasMore(
    redisHasMore: boolean,
    offset: number,
    returnedCount: number,
    tagId?: string,
  ): Promise<boolean> {
    if (redisHasMore) return true;

    const windowSize = await this.postsCacheRepository.getFeedWindowSize(tagId);
    if (windowSize < POST_FEED_REDIS_WINDOW_SIZE) return false;

    const total = await this.postsRepository.countPosts(tagId);
    return offset + returnedCount < total;
  }

  async listPostsByAuthor(
    authorId: number,
    viewerUserId: number,
    offset = 0,
  ): Promise<FeedPageResponse> {
    const { rows, hasMore } = await this.postsRepository.findPostsByAuthor(
      authorId,
      viewerUserId,
      offset,
    );

    return this.buildFeedPageFromRows(rows, viewerUserId, hasMore);
  }

  async listUpvotedPostsByUser(
    voterId: number,
    viewerUserId: number,
    offset = 0,
  ): Promise<FeedPageResponse> {
    const { rows, hasMore } = await this.postsRepository.findUpvotedPosts(
      voterId,
      viewerUserId,
      offset,
    );

    return this.buildFeedPageFromRows(rows, viewerUserId, hasMore);
  }

  async listCommentsByAuthor(authorId: number, offset = 0) {
    const { rows, hasMore } = await this.postsRepository.findCommentsByAuthor(
      authorId,
      offset,
    );

    return {
      items: rows.map((row) => ({
        comment_id: row.comment_id,
        post_id: row.post_id,
        text: row.text,
        created_at: row.created_at.toISOString(),
        post: {
          post_id: row.post.post_id,
          title: row.post.title,
          description: row.post.description,
        },
      })),
      has_more: hasMore,
    };
  }

  async listComments(
    postId: number,
    viewerUserId: number,
    offset = 0,
    limit = 5,
  ) {
    await this.badgesService.syncEarnedBadges(viewerUserId);
    await this.requirePost(postId);

    // Keep Postgres column + Redis aligned with real comment rows.
    // Feed still reads Redis; this heals any prior drift when a post is opened.
    void this.reconcileCommentCount(postId).catch((error) => {
      this.logger.warn(
        `Failed to reconcile comment count for post ${postId}`,
        error,
      );
    });

    const { rows, hasMore } = await this.postsRepository.findComments(
      postId,
      viewerUserId,
      offset,
      limit,
    );
    const authorIds = [...new Set(rows.map((row) => row.author_id))];
    const [onlineById, badgeByUserId] = await Promise.all([
      this.presenceService.areOnline(authorIds),
      this.badgesService.resolveHighestBadgeIdsByUserIds(authorIds),
    ]);

    return {
      items: rows.map((row) =>
        this.toComment(row, viewerUserId, onlineById, badgeByUserId),
      ),
      has_more: hasMore,
    };
  }

  async createComment(
    postId: number,
    userId: number,
    dto: CreateCommentDto,
  ): Promise<PostCommentResponse> {
    const text = dto.text.trim();
    if (!text) {
      throw new BadRequestException('Comment text is required');
    }

    const post = await this.requirePost(postId);

    let parentCommentId: number | undefined;
    let replyToUserId: number | undefined;

    if (dto.parent_comment_id) {
      const parent = await this.postsRepository.findCommentById(
        dto.parent_comment_id,
        postId,
      );
      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }
      parentCommentId = parent.comment_id;
      // The person being replied to is the author of the parent comment.
      // Trust the parent row over the client-supplied reply_to_user_id so the
      // reply notification always reaches the right user (even when the post
      // author replies to a commenter).
      replyToUserId = parent.author_id;
    } else if (dto.reply_to_user_id) {
      replyToUserId =
        dto.reply_to_user_id === post.author_id ? post.author_id : undefined;
    }

    const { comment, post: updatedPost } =
      await this.postsRepository.createComment(postId, userId, text, {
        parentCommentId,
        replyToUserId,
      });

    await this.postsCacheRepository
      .syncCommentCount(updatedPost.post_id, updatedPost.comment_count)
      .catch((error) => {
        this.logger.warn(
          `Failed to sync comment count for post ${postId}`,
          error,
        );
      });

    void this.notificationsService
      .createForComment({
        actor: {
          user_id: comment.author.user_id,
          username: comment.author.username,
          image_url: comment.author.image_url,
          countryFlag: comment.author.countryFlag,
        },
        postId,
        postAuthorId: post.author_id,
        commentId: comment.comment_id,
        text,
        replyToUserId,
      })
      .catch((error) => {
        this.logger.warn(
          `Failed to fan out notifications for comment on post ${postId}`,
          error,
        );
      });

    const [onlineById, badgeByUserId] = await Promise.all([
      this.presenceService.areOnline([comment.author_id]),
      this.badgesService.resolveHighestBadgeIdsByUserIds([comment.author_id]),
    ]);
    return this.toComment(comment, userId, onlineById, badgeByUserId);
  }

  async updateComment(
    postId: number,
    commentId: number,
    userId: number,
    dto: UpdateCommentDto,
  ): Promise<PostCommentResponse> {
    await this.requirePost(postId);

    const comment = await this.postsRepository.findCommentById(
      commentId,
      postId,
    );
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.author_id !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const text = dto.text.trim();
    if (!text) {
      throw new BadRequestException('Comment text is required');
    }

    const updated = await this.postsRepository.updateComment(
      commentId,
      text,
      userId,
    );
    const [onlineById, badgeByUserId] = await Promise.all([
      this.presenceService.areOnline([updated.author_id]),
      this.badgesService.resolveHighestBadgeIdsByUserIds([updated.author_id]),
    ]);
    return this.toComment(updated, userId, onlineById, badgeByUserId);
  }

  async deleteComment(
    postId: number,
    commentId: number,
    userId: number,
  ): Promise<{
    post_id: number;
    comment_count: number;
    removed_comment_ids: number[];
  }> {
    const post = await this.requirePost(postId);

    const comment = await this.postsRepository.findCommentById(
      commentId,
      postId,
    );
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const isAuthor = comment.author_id === userId;
    const isPostOwner = post.author_id === userId;
    if (!isAuthor && !isPostOwner) {
      throw new ForbiddenException('You cannot delete this comment');
    }

    const { post: updatedPost, removedCommentIds } =
      await this.postsRepository.deleteComment(commentId, postId);

    await this.postsCacheRepository
      .syncCommentCount(updatedPost.post_id, updatedPost.comment_count)
      .catch((error) => {
        this.logger.warn(
          `Failed to sync comment count for post ${postId}`,
          error,
        );
      });

    return {
      post_id: postId,
      comment_count: updatedPost.comment_count,
      removed_comment_ids: removedCommentIds,
    };
  }

  async voteComment(
    postId: number,
    commentId: number,
    userId: number,
    dto: VotePostDto,
  ) {
    await this.requirePost(postId);

    const comment = await this.postsRepository.findCommentById(
      commentId,
      postId,
    );
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const { comment: updated, myVote } =
      await this.postsRepository.setCommentVote(commentId, userId, dto.vote);

    return {
      comment_id: updated.comment_id,
      upvote_count: updated.upvote_count,
      downvote_count: updated.downvote_count,
      my_vote: myVote,
    };
  }

  async votePost(
    postId: number,
    userId: number,
    dto: VotePostDto,
  ): Promise<PostEngagementResponse> {
    await this.requirePost(postId);

    const { post, myVote } = await this.postsRepository.setVote(
      postId,
      userId,
      dto.vote,
    );

    await this.postsCacheRepository
      .syncVoteStats(post.post_id, post.upvote_count, post.downvote_count)
      .catch((error) => {
        this.logger.warn(`Failed to sync vote stats for post ${postId}`, error);
      });

    // Notify the post author when a vote is actively cast (not on removal).
    if ((myVote === 'up' || myVote === 'down') && post.author_id !== userId) {
      void this.notifyPostVote(postId, post.author_id, userId, myVote);
    }

    return this.toEngagement(post, myVote);
  }

  private async notifyPostVote(
    postId: number,
    postAuthorId: number,
    actorId: number,
    vote: 'up' | 'down',
  ): Promise<void> {
    try {
      const [actor] = await this.postsRepository.findAuthorsByIds([actorId]);
      if (!actor) return;

      await this.notificationsService.createForVote({
        actor: {
          user_id: actor.user_id,
          username: actor.username,
          image_url: actor.image_url,
          countryFlag: actor.countryFlag,
        },
        postId,
        postAuthorId,
        vote,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to fan out vote notification for post ${postId}`,
        error,
      );
    }
  }

  async sharePost(
    postId: number,
    userId: number,
  ): Promise<PostEngagementResponse> {
    await this.requirePost(postId);

    const post = await this.postsRepository.incrementShareCount(postId);
    const vote = await this.postsRepository.findUserVote(postId, userId);
    const myVote =
      vote?.vote === 'up' || vote?.vote === 'down' ? vote.vote : null;

    await this.postsCacheRepository
      .incrementShareCount(postId)
      .catch((error) => {
        this.logger.warn(
          `Failed to sync share count for post ${postId}`,
          error,
        );
      });

    return this.toEngagement(post, myVote);
  }

  async createPost(userId: number, dto: CreatePostDto) {
    this.assertPostMediaPayload(dto.media_kind, dto.image_crop);

    if (dto.image_url) {
      this.storageService.assertOwnedPostImageUrl(userId, dto.image_url);
    } else if (
      dto.image_frame ||
      dto.image_crop ||
      dto.media_kind === 'video'
    ) {
      throw new BadRequestException(
        'image_url is required when image metadata is provided',
      );
    }

    const data = PostsRepository.fromDto(userId, dto);
    const post = await this.postsRepository.create(data);

    await this.postsCacheRepository.indexPost(post).catch((error) => {
      this.logger.warn(`Failed to index new post ${post.post_id}`, error);
    });

    void this.notifyOnlineUsersOfNewPost(post.post_id, userId, post.title);

    return post;
  }

  private async notifyOnlineUsersOfNewPost(
    postId: number,
    actorId: number,
    title: string,
  ): Promise<void> {
    try {
      const onlineIds = await this.presenceService.getOnlineUserIds();
      if (onlineIds.length === 0) return;

      await this.notificationsService.createForNewPost({
        actorId,
        postId,
        recipientIds: onlineIds,
        text: title,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to fan out new-post notifications for post ${postId}`,
        error,
      );
    }
  }

  async updatePost(postId: number, userId: number, dto: UpdatePostDto) {
    const existing = await this.requireOwnedPost(postId, userId);

    this.assertPostMediaPayload(
      dto.media_kind ?? undefined,
      dto.image_crop ?? undefined,
    );

    if (dto.image_url) {
      this.storageService.assertOwnedPostImageUrl(userId, dto.image_url);
    } else if (dto.image_url === null) {
      // clearing image is allowed
    } else if (
      dto.image_frame ||
      dto.image_crop ||
      dto.media_kind === 'video'
    ) {
      throw new BadRequestException(
        'image_url is required when image metadata is provided',
      );
    }

    const title = dto.title?.trim();
    if (title !== undefined && !title) {
      throw new BadRequestException('Title is required');
    }

    const post = await this.postsRepository.update(postId, {
      ...(title !== undefined ? { title } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description.trim() }
        : {}),
      ...(dto.tag_id !== undefined ? { tag_id: dto.tag_id } : {}),
      ...(dto.image_url !== undefined ? { image_url: dto.image_url } : {}),
      ...(dto.image_url === null
        ? { media_kind: null, media_duration_ms: null }
        : {}),
      ...(dto.image_frame !== undefined
        ? { image_frame: dto.image_frame }
        : {}),
      ...(dto.image_crop !== undefined
        ? {
            image_crop:
              dto.image_crop === null
                ? Prisma.JsonNull
                : (dto.image_crop as unknown as Prisma.InputJsonValue),
          }
        : {}),
      ...(dto.media_kind !== undefined ? { media_kind: dto.media_kind } : {}),
      ...(dto.media_duration_ms !== undefined
        ? { media_duration_ms: dto.media_duration_ms }
        : {}),
    });

    await this.postsCacheRepository
      .updatePostCard(post, existing.tag_id)
      .catch((error) => {
        this.logger.warn(
          `Failed to update Redis cache for post ${postId}`,
          error,
        );
      });

    return post;
  }

  async deletePost(
    postId: number,
    userId: number,
  ): Promise<{ post_id: number }> {
    const post = await this.requireOwnedPost(postId, userId);
    await this.postsRepository.delete(postId);

    await this.postsCacheRepository
      .removePost(postId, post.tag_id)
      .catch((error) => {
        this.logger.warn(`Failed to remove post ${postId} from Redis`, error);
      });

    return { post_id: postId };
  }

  /** Support staff only — reported posts awaiting review, most-reported first. */
  async listReportedPosts(supportUserId: number): Promise<{
    items: (FeedPostResponse & { report_count: number })[];
  }> {
    await this.requireSupportUser(supportUserId);

    const rows = await this.postsRepository.findReportedPosts(supportUserId);
    const page = await this.buildFeedPageFromRows(rows, supportUserId, false);

    // buildFeedPageFromRows preserves row order, so counts line up by index.
    return {
      items: page.items.map((item, index) => ({
        ...item,
        report_count: rows[index]._count.reports,
      })),
    };
  }

  /** Support staff only — clears reports on a post that is actually fine. */
  async dismissPostReports(
    postId: number,
    supportUserId: number,
  ): Promise<{ post_id: number; dismissed: true }> {
    await this.requireSupportUser(supportUserId);

    const post = await this.postsRepository.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.postsRepository.dismissPostReports(postId);
    return { post_id: postId, dismissed: true };
  }

  private async requireSupportUser(userId: number): Promise<void> {
    const user = await this.postsRepository.findUserRole(userId);
    if (!isSupportRole(user?.role)) {
      throw new ForbiddenException('Only support staff can review reports');
    }
  }

  /** Any signed-in user can flag a post for review (Play UGC policy). */
  async reportPost(
    postId: number,
    reporterUserId: number,
    reason?: string,
  ): Promise<{ post_id: number; reported: true }> {
    const post = await this.postsRepository.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.postsRepository.reportPost(postId, reporterUserId, reason);
    return { post_id: postId, reported: true };
  }

  async moderatePost(
    postId: number,
    moderatorUserId: number,
  ): Promise<{ post_id: number; author_id: number }> {
    const moderator = await this.postsRepository.findUserRole(moderatorUserId);
    if (!isSupportRole(moderator?.role)) {
      throw new ForbiddenException('Only support staff can moderate posts');
    }

    const post = await this.postsRepository.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.moderated_at) {
      return { post_id: postId, author_id: post.author_id };
    }

    await this.postsRepository.moderatePost(postId, moderatorUserId);

    await this.postsCacheRepository
      .removePost(postId, post.tag_id)
      .catch((error) => {
        this.logger.warn(`Failed to remove post ${postId} from Redis`, error);
      });

    void this.postModerationPush.notifyPostRemoved({
      authorUserId: post.author_id,
      postId,
    });

    return { post_id: postId, author_id: post.author_id };
  }

  private async buildFeedPageFromRows(
    rows: FeedPostRow[],
    viewerUserId: number,
    hasMore: boolean,
  ): Promise<FeedPageResponse> {
    const authorIds = [...new Set(rows.map((row) => row.author_id))];
    const postIds = rows.map((row) => row.post_id);
    const [onlineById, badgeByUserId, liveVoteCounts] = await Promise.all([
      this.presenceService.areOnline(authorIds),
      this.badgesService.resolveHighestBadgeIdsByUserIds(authorIds),
      this.postsRepository.findVoteCountsForPosts(postIds),
    ]);

    const items = rows.map((row) => {
      const liveVotes = liveVoteCounts.get(row.post_id);
      const normalized = {
        ...row,
        ...(liveVotes
          ? {
              upvote_count: liveVotes.upvote_count,
              downvote_count: liveVotes.downvote_count,
            }
          : {}),
      };

      if (
        liveVotes &&
        (row.upvote_count !== liveVotes.upvote_count ||
          row.downvote_count !== liveVotes.downvote_count)
      ) {
        void this.postsRepository
          .repairPostVoteCounts(
            row.post_id,
            liveVotes.upvote_count,
            liveVotes.downvote_count,
          )
          .catch(() => undefined);
      }

      return this.toFeedPost(
        normalized,
        viewerUserId,
        onlineById,
        badgeByUserId,
      );
    });

    return { items, has_more: hasMore };
  }

  private async buildFeedFromCache(
    viewerUserId: number,
    postIds: number[],
  ): Promise<FeedPostResponse[]> {
    if (postIds.length === 0) return [];

    const cards = await this.postsCacheRepository.getPostCards(postIds);
    const missingIds = postIds.filter((postId) => !cards.has(postId));

    if (missingIds.length > 0) {
      const rows = await this.postsRepository.findPostsByIds(missingIds);
      await this.postsCacheRepository.indexPosts(rows).catch((error) => {
        this.logger.warn(
          'Failed to backfill missing post cards in Redis',
          error,
        );
      });
      for (const row of rows) {
        cards.set(row.post_id, this.cacheRowFromPost(row));
      }
    }

    // Feed comment counts come from Redis. Vote totals can still drift — overlay
    // live vote counts from Postgres and repair Redis when needed.
    const [votesByPostId, liveVoteCounts] = await Promise.all([
      this.resolveViewerVotes(viewerUserId, postIds),
      this.postsRepository.findVoteCountsForPosts(postIds),
    ]);

    for (const postId of postIds) {
      const card = cards.get(postId);
      const liveVotes = liveVoteCounts.get(postId);
      if (!card) continue;

      if (
        liveVotes &&
        (card.upvote_count !== liveVotes.upvote_count ||
          card.downvote_count !== liveVotes.downvote_count)
      ) {
        card.upvote_count = liveVotes.upvote_count;
        card.downvote_count = liveVotes.downvote_count;
        void this.postsCacheRepository
          .syncVoteStats(
            postId,
            liveVotes.upvote_count,
            liveVotes.downvote_count,
          )
          .catch(() => undefined);
        void this.postsRepository
          .repairPostVoteCounts(
            postId,
            liveVotes.upvote_count,
            liveVotes.downvote_count,
          )
          .catch(() => undefined);
      }

      cards.set(postId, card);
    }

    const authorIds = [
      ...new Set(
        postIds
          .map((postId) => cards.get(postId)?.author_id)
          .filter((id): id is number => Number.isFinite(id)),
      ),
    ];
    const authors = await this.postsRepository.findAuthorsByIds(authorIds);
    const authorById = new Map<number, AuthorRow>();
    for (const author of authors) {
      authorById.set(author.user_id, author);
    }
    const [onlineById, badgeByUserId] = await Promise.all([
      this.presenceService.areOnline(authorIds),
      this.badgesService.resolveHighestBadgeIdsByUserIds(authorIds),
    ]);

    return postIds
      .map((postId) => {
        const card = cards.get(postId);
        const author = card ? authorById.get(card.author_id) : undefined;
        if (!card || !author) return null;

        return this.toFeedPostFromCard(
          card,
          author,
          viewerUserId,
          votesByPostId[postId] ?? null,
          onlineById,
          badgeByUserId,
        );
      })
      .filter((item): item is FeedPostResponse => item !== null);
  }

  private async resolveViewerVotes(
    viewerUserId: number,
    postIds: number[],
  ): Promise<Record<number, 'up' | 'down' | null>> {
    const resolved: Record<number, 'up' | 'down' | null> = {};
    for (const postId of postIds) {
      resolved[postId] = null;
    }

    const rows = await this.postsRepository.findUserVotesForPosts(
      viewerUserId,
      postIds,
    );
    for (const row of rows) {
      if (row.vote === 'up' || row.vote === 'down') {
        resolved[row.post_id] = row.vote;
      }
    }

    return resolved;
  }

  private cacheRowFromPost(row: PostCacheRow): CachedPostCard {
    return {
      post_id: row.post_id,
      author_id: row.author_id,
      title: row.title,
      description: row.description,
      tag_id: row.tag_id ?? '',
      image_url: row.image_url,
      image_frame: row.image_frame,
      image_crop: row.image_crop,
      media_kind: row.media_kind,
      media_duration_ms: row.media_duration_ms,
      upvote_count: row.upvote_count,
      downvote_count: row.downvote_count,
      share_count: row.share_count,
      comment_count: row.comment_count,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }

  private assertPostMediaPayload(
    mediaKind: (typeof POST_MEDIA_KINDS)[number] | null | undefined,
    imageCrop: unknown,
  ): void {
    if (mediaKind && !POST_MEDIA_KINDS.includes(mediaKind)) {
      throw new BadRequestException('Unsupported media kind');
    }

    if (mediaKind === 'video' && imageCrop) {
      throw new BadRequestException('Crop is not supported for video posts');
    }
  }

  private requireOwnedPost(postId: number, userId: number) {
    return this.requirePost(postId).then((post) => {
      if (post.author_id !== userId) {
        throw new ForbiddenException('You can only modify your own posts');
      }
      return post;
    });
  }

  private requirePost(postId: number) {
    return this.postsRepository.findById(postId).then((post) => {
      if (!post || post.moderated_at) {
        throw new NotFoundException('Post not found');
      }
      return post;
    });
  }

  /**
   * Sets `posts.comment_count` and Redis `comments` to the live row count
   * so Community (Redis) and Postgres stay identical.
   */
  private async reconcileCommentCount(postId: number): Promise<number> {
    const counts = await this.postsRepository.findCommentCountsForPosts([
      postId,
    ]);
    const live = counts.get(postId)?.live_count ?? 0;
    const stored = counts.get(postId)?.stored_count ?? 0;

    if (stored !== live) {
      await this.postsRepository.repairPostCommentCount(postId, live);
    }

    await this.postsCacheRepository.syncCommentCount(postId, live);
    return live;
  }

  async getPost(
    viewerUserId: number,
    postId: number,
  ): Promise<FeedPostResponse> {
    await this.badgesService.syncEarnedBadges(viewerUserId);

    const row = await this.postsRepository.findById(postId);
    if (!row || row.moderated_at) {
      throw new NotFoundException('Post not found');
    }

    const [post] = await this.buildFeedFromCache(viewerUserId, [postId]);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  private toAuthor(
    author: AuthorRow,
    onlineById: Record<number, boolean>,
    badgeByUserId: Map<number, string>,
  ): FeedPostAuthor {
    return {
      user_id: author.user_id,
      username: author.username,
      country: author.country,
      countryFlag: author.countryFlag,
      image_url: author.image_url,
      smoke_free_days: smokeFreeDaysFromUser(
        author.streakStart,
        author.quitDate,
      ),
      badge_id: badgeByUserId.get(author.user_id) ?? 'first-step',
      is_online: onlineById[author.user_id] ?? false,
    };
  }

  private toComment(
    row: {
      comment_id: number;
      post_id: number;
      author_id: number;
      parent_comment_id: number | null;
      text: string;
      upvote_count: number;
      downvote_count: number;
      created_at: Date;
      author: AuthorRow;
      reply_to_user: { user_id: number; username: string | null } | null;
      votes: Array<{ vote: string }>;
    },
    viewerUserId: number,
    onlineById: Record<number, boolean> = {},
    badgeByUserId: Map<number, string>,
  ): PostCommentResponse {
    const myVoteRaw = row.votes[0]?.vote;
    const myVote =
      myVoteRaw === 'up' || myVoteRaw === 'down' ? myVoteRaw : null;

    return {
      comment_id: row.comment_id,
      post_id: row.post_id,
      parent_comment_id: row.parent_comment_id,
      reply_to: row.reply_to_user
        ? {
            user_id: row.reply_to_user.user_id,
            username: row.reply_to_user.username,
          }
        : null,
      is_mine: row.author_id === viewerUserId,
      text: row.text,
      upvote_count: row.upvote_count,
      downvote_count: row.downvote_count,
      my_vote: myVote,
      created_at: row.created_at.toISOString(),
      author: this.toAuthor(row.author, onlineById, badgeByUserId),
    };
  }

  private toEngagement(
    post: {
      post_id: number;
      upvote_count: number;
      downvote_count: number;
      share_count: number;
      comment_count: number;
    },
    myVote: 'up' | 'down' | null,
  ): PostEngagementResponse {
    return {
      post_id: post.post_id,
      upvote_count: post.upvote_count,
      downvote_count: post.downvote_count,
      share_count: post.share_count,
      comment_count: post.comment_count,
      my_vote: myVote,
    };
  }

  private toFeedPost(
    row: FeedPostRow,
    viewerUserId: number,
    onlineById: Record<number, boolean> = {},
    badgeByUserId: Map<number, string>,
  ): FeedPostResponse {
    const myVote = row.votes[0]?.vote;
    return {
      post_id: row.post_id,
      author_id: row.author_id,
      is_mine: row.author_id === viewerUserId,
      is_moderated: row.moderated_at != null,
      title: row.title,
      description: row.description,
      tag_id: row.tag_id ?? '',
      image_url: row.image_url,
      image_frame: row.image_frame,
      image_crop: row.image_crop,
      media_kind: row.media_kind,
      media_duration_ms: row.media_duration_ms,
      upvote_count: row.upvote_count,
      downvote_count: row.downvote_count,
      share_count: row.share_count,
      comment_count: row.comment_count,
      my_vote: myVote === 'up' || myVote === 'down' ? myVote : null,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
      author: this.toAuthor(row.author, onlineById, badgeByUserId),
    };
  }

  private toFeedPostFromCard(
    card: CachedPostCard,
    author: AuthorRow,
    viewerUserId: number,
    myVote: 'up' | 'down' | null,
    onlineById: Record<number, boolean> = {},
    badgeByUserId: Map<number, string>,
  ): FeedPostResponse {
    return {
      post_id: card.post_id,
      author_id: card.author_id,
      is_mine: card.author_id === viewerUserId,
      title: card.title,
      description: card.description,
      tag_id: card.tag_id,
      image_url: card.image_url,
      image_frame: card.image_frame,
      image_crop: card.image_crop,
      media_kind: card.media_kind,
      media_duration_ms: card.media_duration_ms,
      upvote_count: card.upvote_count,
      downvote_count: card.downvote_count,
      share_count: card.share_count,
      comment_count: card.comment_count,
      my_vote: myVote,
      created_at: card.created_at,
      updated_at: card.updated_at,
      author: this.toAuthor(author, onlineById, badgeByUserId),
    };
  }
}
