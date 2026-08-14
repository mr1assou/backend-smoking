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
  role: true,
} as const;

const ONBOARDED_USER_WHERE = {
  AND: [{ username: { not: null } }, { NOT: { username: { equals: '' } } }],
};

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

  findUserRole(userId: number) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { role: true },
    });
  }

  listSupportStaff(excludeUserId: number, offset: number, limit: number) {
    return this.prisma.user.findMany({
      where: {
        ...ONBOARDED_USER_WHERE,
        role: 'support',
        user_id: { not: excludeUserId },
      },
      select: PEER_SELECT,
      orderBy: { username: 'asc' },
      skip: offset,
      take: limit + 1,
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

  listThreadsForUser(userId: number, offset = 0, limit = 30) {
    return this.prisma.chatThread.findMany({
      where: {
        OR: [{ user_one_id: userId }, { user_two_id: userId }],
        // Hide threads opened via Message but never used (0 messages).
        messages: { some: {} },
      },
      orderBy: { updated_at: 'desc' },
      skip: offset,
      take: limit + 1,
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

  findOwnedMessage(messageId: number, threadId: number, senderId: number) {
    return this.prisma.chatMessage.findFirst({
      where: {
        message_id: messageId,
        thread_id: threadId,
        sender_id: senderId,
      },
    });
  }

  updateMessageText(messageId: number, text: string, editedAt: Date) {
    return this.prisma.chatMessage.update({
      where: { message_id: messageId },
      data: {
        text,
        edited_at: editedAt,
      },
    });
  }

  softDeleteMessage(messageId: number) {
    return this.prisma.chatMessage.update({
      where: { message_id: messageId },
      data: {
        is_deleted: true,
        text: null,
        media_url: null,
        media_mime_type: null,
        media_duration_ms: null,
        media_size_bytes: null,
      },
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
