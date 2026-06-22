import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { NotificationType } from './types/notification.types';

const ACTOR_SELECT = {
  user_id: true,
  username: true,
  image_url: true,
  countryFlag: true,
} as const;

const NOTIFICATION_INCLUDE = {
  actor: { select: ACTOR_SELECT },
} as const;

export type NotificationRow = {
  notification_id: number;
  type: string;
  post_id: number | null;
  comment_id: number | null;
  text: string | null;
  is_read: boolean;
  created_at: Date;
  actor: {
    user_id: number;
    username: string | null;
    image_url: string | null;
    countryFlag: string | null;
  };
};

type CreateNotificationInput = {
  recipientId: number;
  actorId: number;
  type: NotificationType;
  postId?: number | null;
  commentId?: number | null;
  text?: string | null;
};

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateNotificationInput): Promise<NotificationRow> {
    return this.prisma.notification.create({
      data: {
        recipient_id: input.recipientId,
        actor_id: input.actorId,
        type: input.type,
        post_id: input.postId ?? null,
        comment_id: input.commentId ?? null,
        text: input.text ?? null,
      },
      include: NOTIFICATION_INCLUDE,
    }) as Promise<NotificationRow>;
  }

  listForUser(
    userId: number,
    offset: number,
    limit: number,
  ): Promise<NotificationRow[]> {
    return this.prisma.notification.findMany({
      where: { recipient_id: userId },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit,
      include: NOTIFICATION_INCLUDE,
    }) as Promise<NotificationRow[]>;
  }

  countUnread(userId: number): Promise<number> {
    return this.prisma.notification.count({
      where: { recipient_id: userId, is_read: false },
    });
  }

  async markAllRead(userId: number): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { recipient_id: userId, is_read: false },
      data: { is_read: true },
    });
  }

  async markRead(userId: number, notificationId: number): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { notification_id: notificationId, recipient_id: userId },
      data: { is_read: true },
    });
  }
}
