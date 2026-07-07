import { Injectable, Logger } from '@nestjs/common';
import { toUtcIso } from '../common/utc-instant';
import { NotificationsPubSubService } from './notifications-pubsub.service';
import {
  NotificationsRepository,
  type NotificationRow,
} from './notifications.repository';
import {
  NOTIFICATIONS_PAGE_MAX,
  NOTIFICATIONS_PAGE_SIZE,
  NOTIFICATION_TEXT_PREVIEW_MAX,
} from './lib/notifications-pagination';
import type {
  NotificationDto,
  NotificationListDto,
  NotificationType,
} from './types/notification.types';

type CommentActor = {
  user_id: number;
  username: string | null;
  image_url: string | null;
  countryFlag: string | null;
};

type CreateForCommentInput = {
  actor: CommentActor;
  postId: number;
  postAuthorId: number;
  commentId: number;
  text: string;
  replyToUserId?: number | null;
};

type CreateForVoteInput = {
  actor: CommentActor;
  postId: number;
  postAuthorId: number;
  vote: 'up' | 'down';
};

type CreateForNewPostInput = {
  actorId: number;
  postId: number;
  /** Currently-online user ids (from Redis presence). */
  recipientIds: number[];
  text: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repository: NotificationsRepository,
    private readonly pubSub: NotificationsPubSubService,
  ) {}

  /**
   * Fan out notifications for a new comment:
   *  - the post author gets a `comment` notification
   *  - the replied-to user gets a `reply` notification
   * Self-actions and duplicates are skipped.
   */
  async createForComment(input: CreateForCommentInput): Promise<void> {
    const actorId = input.actor.user_id;
    const preview = input.text.slice(0, NOTIFICATION_TEXT_PREVIEW_MAX);

    // Map recipient -> type. Reply wins over comment for the same user.
    const recipients = new Map<number, NotificationType>();
    if (input.postAuthorId !== actorId) {
      recipients.set(input.postAuthorId, 'comment');
    }
    if (input.replyToUserId && input.replyToUserId !== actorId) {
      recipients.set(input.replyToUserId, 'reply');
    }

    await Promise.all(
      [...recipients.entries()].map(([recipientId, type]) =>
        this.createAndPublish({
          recipientId,
          actorId,
          type,
          postId: input.postId,
          commentId: input.commentId,
          text: preview,
        }).catch((error) => {
          this.logger.warn(
            `Failed to create ${type} notification for user ${recipientId}`,
            error,
          );
        }),
      ),
    );
  }

  /**
   * Notify the post author when someone up/down-votes their post.
   * Self-votes are skipped.
   */
  async createForVote(input: CreateForVoteInput): Promise<void> {
    const actorId = input.actor.user_id;
    if (input.postAuthorId === actorId) return;

    const type: NotificationType = input.vote === 'up' ? 'upvote' : 'downvote';

    await this.createAndPublish({
      recipientId: input.postAuthorId,
      actorId,
      type,
      postId: input.postId,
    }).catch((error) => {
      this.logger.warn(
        `Failed to create ${type} notification for user ${input.postAuthorId}`,
        error,
      );
    });
  }

  /**
   * Notify currently-online users about a brand-new post.
   * Offline users are intentionally skipped (no row stored for them).
   */
  async createForNewPost(input: CreateForNewPostInput): Promise<void> {
    const preview = input.text.slice(0, NOTIFICATION_TEXT_PREVIEW_MAX);
    const recipients = [...new Set(input.recipientIds)].filter(
      (id) => id !== input.actorId,
    );

    await Promise.all(
      recipients.map((recipientId) =>
        this.createAndPublish({
          recipientId,
          actorId: input.actorId,
          type: 'post',
          postId: input.postId,
          text: preview,
        }).catch((error) => {
          this.logger.warn(
            `Failed to create post notification for user ${recipientId}`,
            error,
          );
        }),
      ),
    );
  }

  async list(userId: number, offset = 0, limit = NOTIFICATIONS_PAGE_SIZE) {
    const take = Math.min(Math.max(limit, 1), NOTIFICATIONS_PAGE_MAX);
    const rows = await this.repository.listForUser(userId, offset, take + 1);
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const unreadCount = await this.repository.countUnread(userId);

    const result: NotificationListDto = {
      items: page.map((row) => this.toDto(row)),
      has_more: hasMore,
      unread_count: unreadCount,
    };
    return result;
  }

  async unreadCount(userId: number): Promise<{ unread_count: number }> {
    const unread_count = await this.repository.countUnread(userId);
    return { unread_count };
  }

  async markAllRead(userId: number): Promise<{ unread_count: number }> {
    await this.repository.markAllRead(userId);
    return { unread_count: 0 };
  }

  async markRead(
    userId: number,
    notificationId: number,
  ): Promise<{ unread_count: number }> {
    await this.repository.markRead(userId, notificationId);
    const unread_count = await this.repository.countUnread(userId);
    return { unread_count };
  }

  private async createAndPublish(input: {
    recipientId: number;
    actorId: number;
    type: NotificationType;
    postId: number;
    commentId?: number | null;
    text?: string | null;
  }): Promise<void> {
    const row = await this.repository.create(input);
    const payload = this.toDto(row);

    await this.pubSub
      .publish({
        type: 'notification:new',
        recipient_id: input.recipientId,
        payload,
      })
      .catch((error) => {
        this.logger.warn('Failed to publish notification event', error);
      });
  }

  private toDto(row: NotificationRow): NotificationDto {
    return {
      notification_id: row.notification_id,
      type: (row.type as NotificationType) ?? 'comment',
      actor: {
        user_id: row.actor.user_id,
        username: row.actor.username,
        image_url: row.actor.image_url,
        country_flag: row.actor.countryFlag,
      },
      post_id: row.post_id,
      comment_id: row.comment_id,
      text: row.text,
      is_read: row.is_read,
      created_at: toUtcIso(row.created_at),
    };
  }
}
