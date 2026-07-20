import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePostDto } from './dto/create-post.dto';
import type { PostVoteValue } from './dto/vote-post.dto';
import {
  POST_FEED_PAGE_SIZE,
  POST_FEED_REDIS_WINDOW_SIZE,
} from './lib/post-feed-pagination.constants';
import type { PostFeedSort } from './lib/post-feed-sort.constants';
import { DEFAULT_POST_FEED_SORT } from './lib/post-feed-sort.constants';
import type { PostCacheRow } from './posts-cache.repository';

export type FeedQueryOptions = {
  sort?: PostFeedSort;
  tagId?: string;
  offset?: number;
  limit?: number;
};

const AUTHOR_SELECT = {
  user_id: true,
  username: true,
  country: true,
  countryFlag: true,
  streakStart: true,
  quitDate: true,
  image_url: true,
} as const;

const COMMENT_AUTHOR_SELECT = AUTHOR_SELECT;

const POST_CACHE_SELECT = {
  post_id: true,
  author_id: true,
  title: true,
  description: true,
  tag_id: true,
  image_url: true,
  image_frame: true,
  image_crop: true,
  media_kind: true,
  media_duration_ms: true,
  upvote_count: true,
  downvote_count: true,
  share_count: true,
  comment_count: true,
  created_at: true,
  updated_at: true,
  moderated_at: true,
} as const;

const ACTIVE_POST_FILTER = { moderated_at: null } as const;

export type CreatePostData = {
  authorId: number;
  title: string;
  description: string;
  tagId: string;
  imageUrl?: string;
  imageFrame?: string;
  imageCrop?: Prisma.InputJsonValue;
  mediaKind?: string;
  mediaDurationMs?: number;
};

export type FeedPostRow = Prisma.PostGetPayload<{
  include: {
    author: { select: typeof AUTHOR_SELECT };
    votes: { select: { vote: true } };
  };
}>;

@Injectable()
export class PostsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreatePostData) {
    return this.prisma.post.create({
      data: {
        author_id: data.authorId,
        title: data.title,
        description: data.description,
        tag_id: data.tagId,
        image_url: data.imageUrl,
        image_frame: data.imageFrame,
        image_crop: data.imageCrop,
        media_kind: data.mediaKind,
        media_duration_ms: data.mediaDurationMs,
      },
    });
  }

  findById(postId: number) {
    return this.prisma.post.findUnique({
      where: { post_id: postId },
    });
  }

  findAllForCacheIndex(): Promise<PostCacheRow[]> {
    return this.prisma.post.findMany({
      where: ACTIVE_POST_FILTER,
      select: POST_CACHE_SELECT,
      orderBy: { created_at: 'desc' },
      take: POST_FEED_REDIS_WINDOW_SIZE,
    });
  }

  countPosts(tagId?: string): Promise<number> {
    return this.prisma.post.count({
      where: tagId
        ? { tag_id: tagId, ...ACTIVE_POST_FILTER }
        : ACTIVE_POST_FILTER,
    });
  }

  findUserRole(userId: number) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { role: true },
    });
  }

  moderatePost(postId: number, moderatorId: number) {
    return this.prisma.post.update({
      where: { post_id: postId },
      data: {
        moderated_at: new Date(),
        moderated_by_id: moderatorId,
      },
    });
  }

  /** Idempotent — one report per user per post. */
  reportPost(postId: number, reporterId: number, reason?: string) {
    return this.prisma.postReport.upsert({
      where: {
        post_id_reporter_id: { post_id: postId, reporter_id: reporterId },
      },
      create: {
        post_id: postId,
        reporter_id: reporterId,
        reason: reason ?? null,
      },
      update: { reason: reason ?? null },
    });
  }

  /** Reported posts still visible in the feed, most-reported first. */
  findReportedPosts(viewerUserId: number) {
    return this.prisma.post.findMany({
      where: { reports: { some: {} }, ...ACTIVE_POST_FILTER },
      orderBy: [{ reports: { _count: 'desc' } }, { created_at: 'desc' }],
      include: {
        author: { select: AUTHOR_SELECT },
        votes: {
          where: { user_id: viewerUserId },
          take: 1,
          select: { vote: true },
        },
        _count: { select: { reports: true } },
      },
    });
  }

  /** Clears all reports on a post (support decided it is fine). */
  dismissPostReports(postId: number) {
    return this.prisma.postReport.deleteMany({ where: { post_id: postId } });
  }

  findPostsByIds(postIds: number[]) {
    if (postIds.length === 0) return Promise.resolve([]);

    return this.prisma.post.findMany({
      where: { post_id: { in: postIds }, ...ACTIVE_POST_FILTER },
      include: {
        author: { select: AUTHOR_SELECT },
      },
    });
  }

  findAuthorsByIds(authorIds: number[]) {
    if (authorIds.length === 0) return Promise.resolve([]);

    return this.prisma.user.findMany({
      where: { user_id: { in: authorIds } },
      select: AUTHOR_SELECT,
    });
  }

  findUserVotesForPosts(userId: number, postIds: number[]) {
    if (postIds.length === 0) {
      return Promise.resolve([] as Array<{ post_id: number; vote: string }>);
    }

    return this.prisma.postVote.findMany({
      where: {
        user_id: userId,
        post_id: { in: postIds },
      },
      select: { post_id: true, vote: true },
    });
  }

  async findComments(
    postId: number,
    viewerUserId: number,
    offset = 0,
    limit = 5,
  ) {
    const rows = await this.prisma.postComment.findMany({
      where: { post_id: postId },
      orderBy: { created_at: 'asc' },
      skip: offset,
      take: limit + 1,
      include: {
        author: { select: COMMENT_AUTHOR_SELECT },
        reply_to_user: { select: { user_id: true, username: true } },
        votes: {
          where: { user_id: viewerUserId },
          select: { vote: true },
          take: 1,
        },
      },
    });

    const hasMore = rows.length > limit;
    return { rows: rows.slice(0, limit), hasMore };
  }

  findCommentById(commentId: number, postId: number) {
    return this.prisma.postComment.findFirst({
      where: { comment_id: commentId, post_id: postId },
      select: {
        comment_id: true,
        post_id: true,
        author_id: true,
        parent_comment_id: true,
      },
    });
  }

  updateComment(commentId: number, text: string, viewerUserId: number) {
    return this.prisma.postComment.update({
      where: { comment_id: commentId },
      data: { text },
      include: {
        author: { select: COMMENT_AUTHOR_SELECT },
        reply_to_user: { select: { user_id: true, username: true } },
        votes: {
          where: { user_id: viewerUserId },
          select: { vote: true },
          take: 1,
        },
      },
    });
  }

  deleteComment(commentId: number, postId: number) {
    return this.prisma.$transaction(async (tx) => {
      const allComments = await tx.postComment.findMany({
        where: { post_id: postId },
        select: { comment_id: true, parent_comment_id: true },
      });

      const removedCommentIds = this.collectCommentSubtreeIds(
        commentId,
        allComments,
      );
      const removedCount = removedCommentIds.length;

      await tx.postComment.delete({ where: { comment_id: commentId } });

      const post = await tx.post.update({
        where: { post_id: postId },
        data: { comment_count: { decrement: removedCount } },
        select: POST_CACHE_SELECT,
      });

      return { post, removedCommentIds };
    });
  }

  private collectCommentSubtreeIds(
    rootId: number,
    rows: Array<{ comment_id: number; parent_comment_id: number | null }>,
  ): number[] {
    const childrenByParent = new Map<number, number[]>();
    for (const row of rows) {
      if (row.parent_comment_id == null) continue;
      const list = childrenByParent.get(row.parent_comment_id) ?? [];
      list.push(row.comment_id);
      childrenByParent.set(row.parent_comment_id, list);
    }

    const ids: number[] = [];
    const walk = (id: number) => {
      ids.push(id);
      for (const childId of childrenByParent.get(id) ?? []) {
        walk(childId);
      }
    };
    walk(rootId);
    return ids;
  }

  createComment(
    postId: number,
    authorId: number,
    text: string,
    options?: { parentCommentId?: number; replyToUserId?: number },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.postComment.create({
        data: {
          post_id: postId,
          author_id: authorId,
          text,
          parent_comment_id: options?.parentCommentId ?? null,
          reply_to_user_id: options?.replyToUserId ?? null,
        },
        include: {
          author: { select: COMMENT_AUTHOR_SELECT },
          reply_to_user: { select: { user_id: true, username: true } },
          votes: { select: { vote: true }, take: 0 },
        },
      });

      const post = await tx.post.update({
        where: { post_id: postId },
        data: { comment_count: { increment: 1 } },
        select: POST_CACHE_SELECT,
      });

      return { comment, post };
    });
  }

  /**
   * Set the viewer's comment vote to exactly `vote` (`null` clears it), then
   * recount totals from vote rows.
   */
  setCommentVote(
    commentId: number,
    userId: number,
    vote: PostVoteValue | null,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT comment_id FROM post_comments WHERE comment_id = ${commentId} FOR UPDATE`;

      const existing = await tx.postCommentVote.findUnique({
        where: {
          comment_id_user_id: { comment_id: commentId, user_id: userId },
        },
      });

      if (vote === null) {
        if (existing) {
          await tx.postCommentVote.delete({
            where: { comment_vote_id: existing.comment_vote_id },
          });
        }
      } else if (!existing) {
        await tx.postCommentVote.create({
          data: { comment_id: commentId, user_id: userId, vote },
        });
      } else if (existing.vote !== vote) {
        await tx.postCommentVote.update({
          where: { comment_vote_id: existing.comment_vote_id },
          data: { vote },
        });
      }

      const [upCount, downCount] = await Promise.all([
        tx.postCommentVote.count({
          where: { comment_id: commentId, vote: 'up' },
        }),
        tx.postCommentVote.count({
          where: { comment_id: commentId, vote: 'down' },
        }),
      ]);

      const comment = await tx.postComment.update({
        where: { comment_id: commentId },
        data: {
          upvote_count: upCount,
          downvote_count: downCount,
        },
      });

      return { comment, myVote: vote };
    });
  }

  incrementShareCount(postId: number) {
    return this.prisma.post.update({
      where: { post_id: postId },
      data: { share_count: { increment: 1 } },
    });
  }

  findUserVote(postId: number, userId: number) {
    return this.prisma.postVote.findUnique({
      where: { post_id_user_id: { post_id: postId, user_id: userId } },
      select: { vote: true },
    });
  }

  /**
   * Set the viewer's vote to exactly `vote` (`null` clears it), then recount
   * upvote/downvote totals from vote rows so counters never drift.
   */
  setVote(postId: number, userId: number, vote: PostVoteValue | null) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT post_id FROM posts WHERE post_id = ${postId} FOR UPDATE`;

      const existing = await tx.postVote.findUnique({
        where: { post_id_user_id: { post_id: postId, user_id: userId } },
      });

      if (vote === null) {
        if (existing) {
          await tx.postVote.delete({
            where: { post_vote_id: existing.post_vote_id },
          });
        }
      } else if (!existing) {
        await tx.postVote.create({
          data: { post_id: postId, user_id: userId, vote },
        });
      } else if (existing.vote !== vote) {
        await tx.postVote.update({
          where: { post_vote_id: existing.post_vote_id },
          data: { vote },
        });
      }

      const [upCount, downCount] = await Promise.all([
        tx.postVote.count({ where: { post_id: postId, vote: 'up' } }),
        tx.postVote.count({ where: { post_id: postId, vote: 'down' } }),
      ]);

      const post = await tx.post.update({
        where: { post_id: postId },
        data: {
          upvote_count: upCount,
          downvote_count: downCount,
        },
      });

      return { post, myVote: vote };
    });
  }

  /** Live upvote/downvote totals from vote rows (source of truth). */
  async findVoteCountsForPosts(
    postIds: number[],
  ): Promise<Map<number, { upvote_count: number; downvote_count: number }>> {
    const result = new Map<
      number,
      { upvote_count: number; downvote_count: number }
    >();
    for (const postId of postIds) {
      result.set(postId, { upvote_count: 0, downvote_count: 0 });
    }
    if (postIds.length === 0) return result;

    const rows = await this.prisma.postVote.groupBy({
      by: ['post_id', 'vote'],
      where: { post_id: { in: postIds } },
      _count: { _all: true },
    });

    for (const row of rows) {
      const current = result.get(row.post_id) ?? {
        upvote_count: 0,
        downvote_count: 0,
      };
      if (row.vote === 'up') current.upvote_count = row._count._all;
      if (row.vote === 'down') current.downvote_count = row._count._all;
      result.set(row.post_id, current);
    }

    return result;
  }

  repairPostVoteCounts(
    postId: number,
    upvoteCount: number,
    downvoteCount: number,
  ) {
    return this.prisma.post.update({
      where: { post_id: postId },
      data: {
        upvote_count: upvoteCount,
        downvote_count: downvoteCount,
      },
      select: { post_id: true },
    });
  }

  async findFeed(viewerUserId: number, options: FeedQueryOptions = {}) {
    const sort = options.sort ?? DEFAULT_POST_FEED_SORT;
    const offset = options.offset ?? 0;
    const limit = options.limit ?? POST_FEED_PAGE_SIZE;
    const where = {
      ...ACTIVE_POST_FILTER,
      ...(options.tagId ? { tag_id: options.tagId } : {}),
    };

    const orderBy = (() => {
      switch (sort) {
        case 'hottest':
          return [
            { upvote_count: 'desc' as const },
            { created_at: 'desc' as const },
          ];
        case 'most_commented':
          return [
            { comment_count: 'desc' as const },
            { created_at: 'desc' as const },
          ];
        case 'newest':
        default:
          return { created_at: 'desc' as const };
      }
    })();

    const rows = await this.prisma.post.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit + 1,
      include: {
        author: {
          select: AUTHOR_SELECT,
        },
        votes: {
          where: { user_id: viewerUserId },
          take: 1,
          select: { vote: true },
        },
      },
    });

    const hasMore = rows.length > limit;

    return {
      rows: hasMore ? rows.slice(0, limit) : rows,
      hasMore,
    };
  }

  static fromDto(authorId: number, dto: CreatePostDto): CreatePostData {
    return {
      authorId,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? '',
      tagId: dto.tag_id,
      imageUrl: dto.image_url,
      imageFrame: dto.image_frame,
      imageCrop: dto.image_crop as Prisma.InputJsonValue | undefined,
      mediaKind: dto.media_kind,
      mediaDurationMs: dto.media_duration_ms,
    };
  }

  update(postId: number, data: Prisma.PostUpdateInput) {
    return this.prisma.post.update({
      where: { post_id: postId },
      data,
    });
  }

  delete(postId: number) {
    return this.prisma.post.delete({
      where: { post_id: postId },
    });
  }

  async findPostsByAuthor(
    authorId: number,
    viewerUserId: number,
    offset = 0,
    limit = POST_FEED_PAGE_SIZE,
  ) {
    const rows = await this.prisma.post.findMany({
      where: {
        author_id: authorId,
        ...(authorId !== viewerUserId ? ACTIVE_POST_FILTER : {}),
      },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit + 1,
      include: {
        author: { select: AUTHOR_SELECT },
        votes: {
          where: { user_id: viewerUserId },
          take: 1,
          select: { vote: true },
        },
      },
    });

    const hasMore = rows.length > limit;
    return {
      rows: hasMore ? rows.slice(0, limit) : rows,
      hasMore,
    };
  }

  async findCommentsByAuthor(
    authorId: number,
    offset = 0,
    limit = POST_FEED_PAGE_SIZE,
  ) {
    const rows = await this.prisma.postComment.findMany({
      where: { author_id: authorId },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit + 1,
      select: {
        comment_id: true,
        post_id: true,
        text: true,
        created_at: true,
        post: {
          select: {
            post_id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    const hasMore = rows.length > limit;
    return {
      rows: hasMore ? rows.slice(0, limit) : rows,
      hasMore,
    };
  }

  async findUpvotedPosts(
    voterId: number,
    viewerUserId: number,
    offset = 0,
    limit = POST_FEED_PAGE_SIZE,
  ) {
    const rows = await this.prisma.post.findMany({
      where: {
        ...ACTIVE_POST_FILTER,
        votes: {
          some: {
            user_id: voterId,
            vote: 'up',
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit + 1,
      include: {
        author: { select: AUTHOR_SELECT },
        votes: {
          where: { user_id: viewerUserId },
          take: 1,
          select: { vote: true },
        },
      },
    });

    const hasMore = rows.length > limit;
    return {
      rows: hasMore ? rows.slice(0, limit) : rows,
      hasMore,
    };
  }
}
