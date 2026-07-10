import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { toUtcIso } from '../common/utc-instant';
import { BadgesService } from '../badges/badges.service';
import { ChatPushNotificationService } from '../push-notifications/chat-push-notification.service';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import { ChatPubSubService } from './chat-pubsub.service';
import { ChatRepository } from './chat.repository';
import type { RecordCallHistoryDto } from './dto/record-call-history.dto';
import type { SendMessageDto } from './dto/send-message.dto';
import type { EditMessageDto } from './dto/edit-message.dto';
import {
  canonicalThreadPair,
  peerUserIdFromThread,
} from './lib/canonical-thread-pair';
import { encodeCallHistoryPayload } from './lib/call-history-message';
import { isWithinChatMessageEditWindow } from './lib/chat-message-mutation';
import {
  CHAT_MESSAGES_PAGE_MAX,
  CHAT_MESSAGES_PAGE_SIZE,
} from './lib/chat-pagination';
import type {
  ChatMessageDto,
  ChatMessagesPageDto,
  ChatThreadSummaryDto,
  ChatThreadsPageDto,
  MessagesSeenPayload,
  SupportUsersPageDto,
} from './types/chat.types';
import { DEFAULT_USER_ROLE } from '../users/lib/user-roles';

type ThreadWithRelations = NonNullable<
  Awaited<ReturnType<ChatRepository['findThreadForUser']>>
>;

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly chatPubSub: ChatPubSubService,
    private readonly storageService: StorageService,
    private readonly chatPushNotification: ChatPushNotificationService,
    private readonly badgesService: BadgesService,
    private readonly redis: RedisService,
  ) {}

  async listThreads(
    userId: number,
    offset = 0,
    limit = 30,
  ): Promise<ChatThreadsPageDto> {
    const take = Math.min(Math.max(limit, 1), 50);
    const safeOffset = Math.max(offset, 0);
    const rows = await this.chatRepository.listThreadsForUser(
      userId,
      safeOffset,
      take,
    );

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const peerIds = page.map((row) =>
      row.user_one_id === userId ? row.userTwo.user_id : row.userOne.user_id,
    );
    const badgeByUserId =
      await this.badgesService.resolveHighestBadgeIdsByUserIds(peerIds);
    const items = await Promise.all(
      page.map(async (row) => {
        const myRead = row.reads.find((read) => read.user_id === userId);
        const unreadCount = await this.chatRepository.countUnreadMessages(
          row.thread_id,
          userId,
          myRead?.last_read_at,
        );
        const peerId =
          row.user_one_id === userId ? row.userTwo.user_id : row.userOne.user_id;
        return this.toThreadSummary(
          row,
          userId,
          unreadCount,
          badgeByUserId.get(peerId) ?? 'first-step',
        );
      }),
    );

    return { items, has_more: hasMore };
  }

  async listSupportUsers(
    userId: number,
    offset = 0,
    limit = 30,
  ): Promise<SupportUsersPageDto> {
    const take = Math.min(Math.max(limit, 1), 50);
    const safeOffset = Math.max(offset, 0);
    const rows = await this.chatRepository.listSupportStaff(
      userId,
      safeOffset,
      take,
    );

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const userIds = page.map((row) => row.user_id);
    const badgeByUserId =
      await this.badgesService.resolveHighestBadgeIdsByUserIds(userIds);

    return {
      items: page.map((row) => ({
        user_id: row.user_id,
        username: row.username,
        image_url: row.image_url,
        country_flag: row.countryFlag,
        badge_id: badgeByUserId.get(row.user_id) ?? 'first-step',
        role: row.role ?? DEFAULT_USER_ROLE,
      })),
      has_more: hasMore,
    };
  }

  async openThread(
    userId: number,
    peerUserId: number,
  ): Promise<ChatThreadSummaryDto> {
    if (peerUserId === userId) {
      throw new BadRequestException('Cannot open a chat with yourself');
    }

    const peer = await this.chatRepository.findUserExists(peerUserId);
    if (!peer?.username?.trim()) {
      throw new NotFoundException('User not found');
    }

    const thread = await this.chatRepository.findOrCreateThread(
      userId,
      peerUserId,
    );
    const myRead = thread.reads.find((read) => read.user_id === userId);
    const unreadCount = await this.chatRepository.countUnreadMessages(
      thread.thread_id,
      userId,
      myRead?.last_read_at,
    );
    const peerId = peerUserIdFromThread(thread, userId);
    const badgeByUserId =
      await this.badgesService.resolveHighestBadgeIdsByUserIds([peerId]);
    return this.toThreadSummary(
      thread,
      userId,
      unreadCount,
      badgeByUserId.get(peerId) ?? 'first-step',
    );
  }

  async listMessages(
    userId: number,
    threadId: number,
    before?: string,
    limit = CHAT_MESSAGES_PAGE_SIZE,
  ): Promise<ChatMessagesPageDto> {
    const thread = await this.requireThread(threadId, userId);
    const beforeDate = before ? new Date(before) : undefined;
    if (before && Number.isNaN(beforeDate?.getTime())) {
      throw new BadRequestException('Invalid before cursor');
    }

    const take = Math.min(Math.max(limit, 1), CHAT_MESSAGES_PAGE_MAX);
    const rows = await this.chatRepository.listMessages(
      threadId,
      beforeDate,
      take + 1,
    );
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;

    return {
      items: page
        .slice()
        .reverse()
        .map((row) => this.toMessageDto(row)),
      has_more: hasMore,
      peer_last_read_at: this.peerLastReadAt(thread, userId),
    };
  }

  async sendMessage(
    userId: number,
    threadId: number,
    dto: SendMessageDto,
  ): Promise<ChatMessageDto> {
    const thread = await this.requireThread(threadId, userId);
    this.validateMessagePayload(userId, dto);

    const message = await this.chatRepository.createMessage({
      threadId,
      senderId: userId,
      messageType: dto.message_type,
      text: dto.text ?? null,
      mediaUrl: dto.media_url ?? null,
      mediaMimeType: dto.media_mime_type ?? null,
      mediaDurationMs: dto.media_duration_ms ?? null,
      mediaSizeBytes: dto.media_size_bytes ?? null,
    });

    const payload = this.toMessageDto(message);
    const [user_one_id, user_two_id] = canonicalThreadPair(
      thread.user_one_id,
      thread.user_two_id,
    );

    await this.chatPubSub.publish({
      type: 'chat:message',
      thread_id: threadId,
      user_one_id,
      user_two_id,
      payload,
    });

    const recipientUserId = peerUserIdFromThread(thread, userId);
    const sender =
      thread.user_one_id === userId ? thread.userOne : thread.userTwo;

    void this.chatPushNotification.notifyNewMessageIfOffline({
      recipientUserId,
      senderUserId: userId,
      senderUsername: sender.username,
      threadId,
      messageType: dto.message_type,
      text: dto.text ?? null,
    });

    return payload;
  }

  /** Persists a single call-history row in the peer's chat thread (deduped by call id). */
  async recordCallHistory(
    userId: number,
    dto: RecordCallHistoryDto,
  ): Promise<
    { ok: true; message: ChatMessageDto } | { ok: true; duplicate: true }
  > {
    if (dto.peer_user_id === userId) {
      throw new BadRequestException('Invalid peer');
    }

    const peer = await this.chatRepository.findUserExists(dto.peer_user_id);
    if (!peer?.username?.trim()) {
      throw new NotFoundException('User not found');
    }

    const dedupeKey = `call:history:${dto.call_id}`;
    const claimed = await this.redis
      .getClient()
      .set(dedupeKey, '1', 'EX', 3600, 'NX');
    if (claimed !== 'OK') {
      return { ok: true, duplicate: true };
    }

    const thread = await this.chatRepository.findOrCreateThread(
      userId,
      dto.peer_user_id,
    );

    const text = encodeCallHistoryPayload({
      v: 1,
      callKind: dto.call_kind,
      status: dto.status,
      durationMs: dto.duration_ms,
    });

    const message = await this.chatRepository.createMessage({
      threadId: thread.thread_id,
      senderId: userId,
      messageType: 'call',
      text,
    });

    const payload = this.toMessageDto(message);
    const [user_one_id, user_two_id] = canonicalThreadPair(
      thread.user_one_id,
      thread.user_two_id,
    );

    await this.chatPubSub.publish({
      type: 'chat:message',
      thread_id: thread.thread_id,
      user_one_id,
      user_two_id,
      payload,
    });

    return { ok: true, message: payload };
  }

  async editMessage(
    userId: number,
    threadId: number,
    messageId: number,
    dto: EditMessageDto,
  ): Promise<ChatMessageDto> {
    const thread = await this.requireThread(threadId, userId);
    const message = await this.requireOwnedMessage(userId, threadId, messageId);

    if (!isWithinChatMessageEditWindow(message.created_at)) {
      throw new ForbiddenException('This message can no longer be edited');
    }

    if (message.message_type !== 'text') {
      throw new BadRequestException('Only text messages can be edited');
    }

    const text = dto.text.trim();
    if (!text) throw new BadRequestException('Text is required');

    const updated = await this.chatRepository.updateMessageText(
      messageId,
      text,
      new Date(),
    );

    const payload = this.toMessageDto(updated);
    await this.publishThreadMessageEvent(
      thread,
      'chat:message_updated',
      payload,
    );
    return payload;
  }

  async deleteMessage(
    userId: number,
    threadId: number,
    messageId: number,
  ): Promise<ChatMessageDto> {
    const thread = await this.requireThread(threadId, userId);
    await this.requireOwnedMessage(userId, threadId, messageId);

    const deleted = await this.chatRepository.softDeleteMessage(messageId);
    const payload = this.toMessageDto(deleted);
    await this.publishThreadMessageEvent(
      thread,
      'chat:message_deleted',
      payload,
    );
    return payload;
  }

  async resolvePeerUserId(
    threadId: number,
    viewerUserId: number,
  ): Promise<number | null> {
    const thread = await this.chatRepository.findThreadForUser(
      threadId,
      viewerUserId,
    );
    if (!thread) return null;
    return peerUserIdFromThread(thread, viewerUserId);
  }

  async markSeen(
    userId: number,
    threadId: number,
  ): Promise<MessagesSeenPayload> {
    const thread = await this.requireThread(threadId, userId);
    const lastReadAt = new Date();

    await this.chatRepository.upsertThreadRead(threadId, userId, lastReadAt);

    const payload: MessagesSeenPayload = {
      thread_id: threadId,
      reader_user_id: userId,
      last_read_at: toUtcIso(lastReadAt),
    };

    const peerUserId = peerUserIdFromThread(thread, userId);
    await this.chatPubSub.publish({
      type: 'messages_seen',
      peer_user_id: peerUserId,
      payload,
    });

    return payload;
  }

  private async requireThread(
    threadId: number,
    userId: number,
  ): Promise<ThreadWithRelations> {
    const thread = await this.chatRepository.findThreadForUser(
      threadId,
      userId,
    );
    if (!thread) throw new NotFoundException('Thread not found');
    return thread;
  }

  private validateMessagePayload(userId: number, dto: SendMessageDto): void {
    if (dto.message_type === 'call') {
      throw new BadRequestException(
        'Call history is recorded via the call-history endpoint',
      );
    }
    if (dto.message_type === 'text') {
      const text = dto.text?.trim();
      if (!text) throw new BadRequestException('Text is required');
      return;
    }

    if (!dto.media_url?.trim()) {
      throw new BadRequestException('media_url is required for media messages');
    }

    this.storageService.assertOwnedChatMediaUrl(userId, dto.media_url);
  }

  private toMessageDto(message: {
    message_id: number;
    thread_id: number;
    sender_id: number;
    message_type: string;
    text: string | null;
    media_url: string | null;
    media_mime_type: string | null;
    media_duration_ms: number | null;
    media_size_bytes: number | null;
    is_deleted: boolean;
    edited_at: Date | null;
    created_at: Date;
  }): ChatMessageDto {
    return {
      message_id: message.message_id,
      thread_id: message.thread_id,
      sender_id: message.sender_id,
      message_type: message.message_type as ChatMessageDto['message_type'],
      text: message.text,
      media_url: message.media_url,
      media_mime_type: message.media_mime_type,
      media_duration_ms: message.media_duration_ms,
      media_size_bytes: message.media_size_bytes,
      is_deleted: message.is_deleted,
      edited_at: message.edited_at ? toUtcIso(message.edited_at) : null,
      created_at: toUtcIso(message.created_at),
    };
  }

  private async requireOwnedMessage(
    userId: number,
    threadId: number,
    messageId: number,
  ) {
    const message = await this.chatRepository.findOwnedMessage(
      messageId,
      threadId,
      userId,
    );
    if (!message) throw new NotFoundException('Message not found');
    if (message.is_deleted) {
      throw new BadRequestException('Message already deleted');
    }
    return message;
  }

  private async publishThreadMessageEvent(
    thread: ThreadWithRelations,
    type: 'chat:message_updated' | 'chat:message_deleted',
    payload: ChatMessageDto,
  ) {
    const [user_one_id, user_two_id] = canonicalThreadPair(
      thread.user_one_id,
      thread.user_two_id,
    );

    await this.chatPubSub.publish({
      type,
      thread_id: thread.thread_id,
      user_one_id,
      user_two_id,
      payload,
    });
  }

  private toThreadSummary(
    thread: {
      thread_id: number;
      user_one_id: number;
      user_two_id: number;
      updated_at: Date;
      userOne: {
        user_id: number;
        username: string | null;
        image_url: string | null;
        countryFlag: string | null;
        role: string;
      };
      userTwo: {
        user_id: number;
        username: string | null;
        image_url: string | null;
        countryFlag: string | null;
        role: string;
      };
      reads: { user_id: number; last_read_at: Date }[];
      messages: {
        message_id: number;
        thread_id: number;
        sender_id: number;
        message_type: string;
        text: string | null;
        media_url: string | null;
        media_mime_type: string | null;
        media_duration_ms: number | null;
        media_size_bytes: number | null;
        is_deleted: boolean;
        edited_at: Date | null;
        created_at: Date;
      }[];
    },
    viewerUserId: number,
    unreadCount = 0,
    peerBadgeId = 'first-step',
  ): ChatThreadSummaryDto {
    const peer =
      thread.user_one_id === viewerUserId ? thread.userTwo : thread.userOne;
    const peerRead = thread.reads.find((row) => row.user_id === peer.user_id);
    const lastMessage = thread.messages[0] ?? null;

    return {
      thread_id: thread.thread_id,
      peer_user_id: peer.user_id,
      peer_username: peer.username,
      peer_image_url: peer.image_url,
      peer_country_flag: peer.countryFlag,
      peer_badge_id: peerBadgeId,
      peer_role: peer.role ?? DEFAULT_USER_ROLE,
      last_message: lastMessage ? this.toMessageDto(lastMessage) : null,
      unread_count: unreadCount,
      peer_last_read_at: peerRead ? toUtcIso(peerRead.last_read_at) : null,
      updated_at: toUtcIso(thread.updated_at),
    };
  }

  private peerLastReadAt(
    thread: ThreadWithRelations,
    viewerUserId: number,
  ): string | null {
    const peerUserId = peerUserIdFromThread(thread, viewerUserId);
    const peerRead = thread.reads.find((row) => row.user_id === peerUserId);
    return peerRead ? toUtcIso(peerRead.last_read_at) : null;
  }
}
