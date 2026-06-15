import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { toUtcIso } from '../common/utc-instant';
import { StorageService } from '../storage/storage.service';
import { ChatPubSubService } from './chat-pubsub.service';
import { ChatRepository } from './chat.repository';
import type { SendMessageDto } from './dto/send-message.dto';
import {
  canonicalThreadPair,
  peerUserIdFromThread,
} from './lib/canonical-thread-pair';
import {
  CHAT_MESSAGES_PAGE_MAX,
  CHAT_MESSAGES_PAGE_SIZE,
} from './lib/chat-pagination';
import type {
  ChatMessageDto,
  ChatMessagesPageDto,
  ChatThreadSummaryDto,
  MessagesSeenPayload,
} from './types/chat.types';

type ThreadWithRelations = NonNullable<
  Awaited<ReturnType<ChatRepository['findThreadForUser']>>
>;

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly chatPubSub: ChatPubSubService,
    private readonly storageService: StorageService,
  ) {}

  async listThreads(userId: number): Promise<ChatThreadSummaryDto[]> {
    const rows = await this.chatRepository.listThreadsForUser(userId);
    return Promise.all(
      rows.map(async (row) => {
        const myRead = row.reads.find((read) => read.user_id === userId);
        const unreadCount = await this.chatRepository.countUnreadMessages(
          row.thread_id,
          userId,
          myRead?.last_read_at,
        );
        return this.toThreadSummary(row, userId, unreadCount);
      }),
    );
  }

  async openThread(userId: number, peerUserId: number): Promise<ChatThreadSummaryDto> {
    if (peerUserId === userId) {
      throw new BadRequestException('Cannot open a chat with yourself');
    }

    const peer = await this.chatRepository.findUserExists(peerUserId);
    if (!peer?.username?.trim()) {
      throw new NotFoundException('User not found');
    }

    const thread = await this.chatRepository.findOrCreateThread(userId, peerUserId);
    const myRead = thread.reads.find((read) => read.user_id === userId);
    const unreadCount = await this.chatRepository.countUnreadMessages(
      thread.thread_id,
      userId,
      myRead?.last_read_at,
    );
    return this.toThreadSummary(thread, userId, unreadCount);
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

    return payload;
  }

  async resolvePeerUserId(
    threadId: number,
    viewerUserId: number,
  ): Promise<number | null> {
    const thread = await this.chatRepository.findThreadForUser(threadId, viewerUserId);
    if (!thread) return null;
    return peerUserIdFromThread(thread, viewerUserId);
  }

  async markSeen(userId: number, threadId: number): Promise<MessagesSeenPayload> {
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
    const thread = await this.chatRepository.findThreadForUser(threadId, userId);
    if (!thread) throw new NotFoundException('Thread not found');
    return thread;
  }

  private validateMessagePayload(userId: number, dto: SendMessageDto): void {
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
      created_at: toUtcIso(message.created_at),
    };
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
      };
      userTwo: {
        user_id: number;
        username: string | null;
        image_url: string | null;
        countryFlag: string | null;
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
        created_at: Date;
      }[];
    },
    viewerUserId: number,
    unreadCount = 0,
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
      last_message: lastMessage ? this.toMessageDto(lastMessage) : null,
      unread_count: unreadCount,
      peer_last_read_at: peerRead ? toUtcIso(peerRead.last_read_at) : null,
      updated_at: toUtcIso(thread.updated_at),
    };
  }

  private peerLastReadAt(thread: ThreadWithRelations, viewerUserId: number): string | null {
    const peerUserId = peerUserIdFromThread(thread, viewerUserId);
    const peerRead = thread.reads.find((row) => row.user_id === peerUserId);
    return peerRead ? toUtcIso(peerRead.last_read_at) : null;
  }
}
