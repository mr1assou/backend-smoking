import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { canonicalThreadPair } from './lib/canonical-thread-pair';
import { CHAT_MESSAGES_PAGE_SIZE } from './lib/chat-pagination';
import type { ChatMessageType } from './types/chat.types';

const PEER_SELECT = {
  user_id: true,
  username: true,
  image_url: true,
  countryFlag: true,
} as const;

type CreateMessageInput = {
  threadId: number;
  senderId: number;
  messageType: ChatMessageType;
  text?: string | null;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
  mediaDurationMs?: number | null;
  mediaSizeBytes?: number | null;
};

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserExists(userId: number) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { user_id: true, username: true },
    });
  }

  findThreadForUser(threadId: number, userId: number) {
    return this.prisma.chatThread.findFirst({
      where: {
        thread_id: threadId,
        OR: [{ user_one_id: userId }, { user_two_id: userId }],
      },
      include: {
        userOne: { select: PEER_SELECT },
        userTwo: { select: PEER_SELECT },
        reads: true,
      },
    });
  }

  findOrCreateThread(userIdA: number, userIdB: number) {
    const [user_one_id, user_two_id] = canonicalThreadPair(userIdA, userIdB);
    return this.prisma.chatThread.upsert({
      where: {
        user_one_id_user_two_id: { user_one_id, user_two_id },
      },
      create: { user_one_id, user_two_id },
      update: {},
      include: {
        userOne: { select: PEER_SELECT },
        userTwo: { select: PEER_SELECT },
        reads: true,
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });
  }

  listThreadsForUser(userId: number) {
    return this.prisma.chatThread.findMany({
      where: {
        OR: [{ user_one_id: userId }, { user_two_id: userId }],
      },
      orderBy: { updated_at: 'desc' },
      include: {
        userOne: { select: PEER_SELECT },
        userTwo: { select: PEER_SELECT },
        reads: true,
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });
  }

  listMessages(
    threadId: number,
    before?: Date,
    limit = CHAT_MESSAGES_PAGE_SIZE,
  ) {
    return this.prisma.chatMessage.findMany({
      where: {
        thread_id: threadId,
        ...(before ? { created_at: { lt: before } } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  createMessage(input: CreateMessageInput) {
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data: {
          thread_id: input.threadId,
          sender_id: input.senderId,
          message_type: input.messageType,
          text: input.text ?? null,
          media_url: input.mediaUrl ?? null,
          media_mime_type: input.mediaMimeType ?? null,
          media_duration_ms: input.mediaDurationMs ?? null,
          media_size_bytes: input.mediaSizeBytes ?? null,
        },
      });

      await tx.chatThread.update({
        where: { thread_id: input.threadId },
        data: { updated_at: message.created_at },
      });

      return message;
    });
  }

  upsertThreadRead(threadId: number, userId: number, lastReadAt: Date) {
    return this.prisma.chatThreadRead.upsert({
      where: {
        thread_id_user_id: { thread_id: threadId, user_id: userId },
      },
      create: {
        thread_id: threadId,
        user_id: userId,
        last_read_at: lastReadAt,
      },
      update: { last_read_at: lastReadAt },
    });
  }

  countUnreadMessages(
    threadId: number,
    viewerUserId: number,
    lastReadAt?: Date | null,
  ) {
    return this.prisma.chatMessage.count({
      where: {
        thread_id: threadId,
        sender_id: { not: viewerUserId },
        ...(lastReadAt ? { created_at: { gt: lastReadAt } } : {}),
      },
    });
  }
}
