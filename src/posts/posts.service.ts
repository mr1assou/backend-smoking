import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { PresenceService } from '../presence/presence.service';
import { NotificationsService } from '../notifications/notifications.service';
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
    private readonly notificationsService: NotificationsService,
  ) {}

  async listFeed(
    viewerUserId: number,
    query: ListPostsQueryDto = {},
  ): Promise<FeedPageResponse> {
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
    await this.requirePost(postId);

    const { rows, hasMore } = await this.postsRepository.findComments(
      postId,
      viewerUserId,
      offset,
      limit,
    );
    const authorIds = [...new Set(rows.map((row) => row.author_id))];
    const onlineById = await this.presenceService.areOnline(authorIds);

    return {
      items: rows.map((row) => this.toComment(row, viewerUserId, onlineById)),
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

    const onlineById = await this.presenceService.areOnline([
      comment.author_id,
    ]);
    return this.toComment(comment, userId, onlineById);
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
    const onlineById = await this.presenceService.areOnline([
      updated.author_id,
    ]);
    return this.toComment(updated, userId, onlineById);
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
      await this.postsRepository.toggleCommentVote(commentId, userId, dto.vote);

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

    const { post, myVote } = await this.postsRepository.toggleVote(
      postId,
      userId,
      dto.vote,
    );

    await this.postsCacheRepository
      .syncVoteStats(post.post_id, post.upvote_count, post.downvote_count)
      .catch((error) => {
        this.logger.warn(
          `Failed to sync vote stats for post ${postId}`,
          error,
        );
      });

    // Notify the post author when a vote is actively cast (not on removal).
    if (
      (myVote === 'up' || myVote === 'down') &&
      post.author_id !== userId
    ) {
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
    } else if (dto.image_frame || dto.image_crop || dto.media_kind === 'video') {
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
      ...(dto.media_kind !== undefined
        ? { media_kind: dto.media_kind }
        : {}),
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

  private async buildFeedPageFromRows(
    rows: FeedPostRow[],
    viewerUserId: number,
    hasMore: boolean,
  ): Promise<FeedPageResponse> {
    const authorIds = [...new Set(rows.map((row) => row.author_id))];
    const onlineById = await this.presenceService.areOnline(authorIds);

    return {
      items: rows.map((row) => this.toFeedPost(row, viewerUserId, onlineById)),
      has_more: hasMore,
    };
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

    const votesByPostId = await this.resolveViewerVotes(viewerUserId, postIds);
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
    const onlineById = await this.presenceService.areOnline(authorIds);

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
      if (!post) throw new NotFoundException('Post not found');
      return post;
    });
  }

  async getPost(
    viewerUserId: number,
    postId: number,
  ): Promise<FeedPostResponse> {
    const [post] = await this.buildFeedFromCache(viewerUserId, [postId]);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  private toAuthor(
    author: AuthorRow,
    onlineById: Record<number, boolean> = {},
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
      author: this.toAuthor(row.author, onlineById),
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
  ): FeedPostResponse {
    const myVote = row.votes[0]?.vote;
    return {
      post_id: row.post_id,
      author_id: row.author_id,
      is_mine: row.author_id === viewerUserId,
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
      author: this.toAuthor(row.author, onlineById),
    };
  }

  private toFeedPostFromCard(
    card: CachedPostCard,
    author: AuthorRow,
    viewerUserId: number,
    myVote: 'up' | 'down' | null,
    onlineById: Record<number, boolean> = {},
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
      author: this.toAuthor(author, onlineById),
    };
  }
}
