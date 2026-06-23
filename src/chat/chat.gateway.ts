import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import type { Server, Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';
import {
  verifyPresenceSocketUser,
  getSocketUser,
  setSocketUser,
} from '../presence/lib/socket-auth';
import { ChatService } from './chat.service';
import {
  CHAT_EVENTS_CHANNEL,
  chatThreadRoom,
  chatUserRoom,
} from './lib/chat.redis-keys';
import type { ChatRedisEvent } from './types/chat.types';

type ThreadBody = { threadId: number };
type TypingBody = { threadId: number; isTyping: boolean };

@Injectable()
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: true, credentials: true },
})
export class ChatGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  private readonly logger = new Logger(ChatGateway.name);
  private subscriber: Redis | null = null;

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit() {
    this.subscriber = this.redis.getClient().duplicate();
    void this.subscriber.subscribe(CHAT_EVENTS_CHANNEL);
    this.subscriber.on('message', (_, raw) => {
      try {
        const event = JSON.parse(raw) as ChatRedisEvent;
        this.handleRedisEvent(event);
      } catch (error) {
        this.logger.error('Failed to handle chat Redis event', error);
      }
    });
  }

  onModuleDestroy() {
    if (!this.subscriber) return;
    this.subscriber.removeAllListeners();
    void this.subscriber.quit();
    this.subscriber = null;
  }

  async handleConnection(client: Socket) {
    const user = verifyPresenceSocketUser(
      client,
      this.jwt,
      this.config.get<string>('JWT_SECRET'),
    );
    if (!user) {
      client.disconnect(true);
      return;
    }

    setSocketUser(client, user);
    await client.join(chatUserRoom(user.userId));
  }

  handleDisconnect(client: Socket): void {
    void client.id;
  }

  @SubscribeMessage('chat:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: ThreadBody,
  ) {
    const user = getSocketUser(client);
    if (!user?.userId || !body?.threadId) return { ok: false };

    try {
      await this.chatService.listMessages(
        user.userId,
        body.threadId,
        undefined,
        1,
      );
      await client.join(chatThreadRoom(body.threadId));
      await this.chatService.markSeen(user.userId, body.threadId);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  @SubscribeMessage('chat:leave')
  async handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: ThreadBody,
  ) {
    if (!body?.threadId) return { ok: false };

    await client.leave(chatThreadRoom(body.threadId));
    return { ok: true };
  }

  @SubscribeMessage('chat:mark_seen')
  async handleMarkSeen(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: ThreadBody,
  ) {
    const user = getSocketUser(client);
    if (!user?.userId || !body?.threadId) return { ok: false };

    try {
      const payload = await this.chatService.markSeen(
        user.userId,
        body.threadId,
      );
      return { ok: true, payload };
    } catch (error) {
      this.logger.warn(`mark_seen failed for user ${user.userId}`, error);
      return { ok: false };
    }
  }

  @SubscribeMessage('chat:typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: TypingBody,
  ) {
    const user = getSocketUser(client);
    if (!user?.userId || !body?.threadId) return { ok: false };

    try {
      const peerUserId = await this.chatService.resolvePeerUserId(
        body.threadId,
        user.userId,
      );
      if (!peerUserId) return { ok: false };

      this.server.to(chatUserRoom(peerUserId)).emit('chat:typing', {
        thread_id: body.threadId,
        user_id: user.userId,
        is_typing: Boolean(body.isTyping),
      });
      return { ok: true };
    } catch (error) {
      this.logger.warn(`typing event failed for user ${user.userId}`, error);
      return { ok: false };
    }
  }

  private handleRedisEvent(event: ChatRedisEvent) {
    switch (event.type) {
      case 'chat:message':
        this.server
          .to(chatUserRoom(event.user_one_id))
          .to(chatUserRoom(event.user_two_id))
          .to(chatThreadRoom(event.thread_id))
          .emit('chat:message', event.payload);
        void this.autoMarkSeenIfPeerViewing(
          event.thread_id,
          event.user_one_id,
          event.user_two_id,
          event.payload.sender_id,
        );
        break;
      case 'chat:message_updated':
        this.server
          .to(chatUserRoom(event.user_one_id))
          .to(chatUserRoom(event.user_two_id))
          .to(chatThreadRoom(event.thread_id))
          .emit('chat:message_updated', event.payload);
        break;
      case 'chat:message_deleted':
        this.server
          .to(chatUserRoom(event.user_one_id))
          .to(chatUserRoom(event.user_two_id))
          .to(chatThreadRoom(event.thread_id))
          .emit('chat:message_deleted', event.payload);
        break;
      case 'messages_seen':
        this.server
          .to(chatUserRoom(event.peer_user_id))
          .emit('messages_seen', event.payload);
        break;
      default:
        break;
    }
  }

  /** If the recipient is actively in the thread room, mark messages seen instantly. */
  private async autoMarkSeenIfPeerViewing(
    threadId: number,
    userOneId: number,
    userTwoId: number,
    senderId: number,
  ) {
    const peerUserId = senderId === userOneId ? userTwoId : userOneId;
    const sockets = await this.server
      .in(chatThreadRoom(threadId))
      .fetchSockets();
    const peerViewing = sockets.some(
      (socket) => getSocketUser(socket)?.userId === peerUserId,
    );
    if (!peerViewing) return;

    try {
      await this.chatService.markSeen(peerUserId, threadId);
    } catch (error) {
      this.logger.warn(`Auto mark seen failed for thread ${threadId}`, error);
    }
  }
}
