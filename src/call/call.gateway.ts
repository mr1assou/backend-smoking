import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
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
  getSocketUser,
  setSocketUser,
  verifyPresenceSocketUser,
} from '../presence/lib/socket-auth';
import { CallService } from './call.service';
import { CALL_EVENTS_CHANNEL, callUserRoom } from './lib/call.redis-keys';
import type { CallKind, CallRedisEvent, CallSignal } from './types/call.types';

type InviteBody = { toUserId: number; callId: string; kind: CallKind };
type CallActionBody = { toUserId: number; callId: string };
type SignalBody = { toUserId: number; callId: string; signal: CallSignal };

@Injectable()
@WebSocketGateway({
  namespace: '/call',
  cors: { origin: true, credentials: true },
})
export class CallGateway
  implements OnGatewayConnection, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CallGateway.name);
  private subscriber: Redis | null = null;

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly callService: CallService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit() {
    this.subscriber = this.redis.getClient().duplicate();
    void this.subscriber.subscribe(CALL_EVENTS_CHANNEL);
    this.subscriber.on('message', (_, raw) => {
      try {
        const event = JSON.parse(raw) as CallRedisEvent;
        this.server
          .to(callUserRoom(event.targetUserId))
          .emit(event.event, event.payload);
      } catch (error) {
        this.logger.error('Failed to handle call Redis event', error);
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
    await client.join(callUserRoom(user.userId));

    // Re-deliver a call that arrived while the app was closed.
    const pending = await this.callService.getPendingCall(user.userId);
    if (pending) {
      client.emit('call:incoming', pending);
    }
  }

  @SubscribeMessage('call:invite')
  async handleInvite(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: InviteBody,
  ) {
    const user = getSocketUser(client);
    if (!user?.userId || !body?.toUserId || !body?.callId) {
      return { ok: false };
    }

    await this.callService.invite(
      user.userId,
      body.toUserId,
      body.callId,
      body.kind === 'video' ? 'video' : 'audio',
    );
    return { ok: true };
  }

  @SubscribeMessage('call:accept')
  async handleAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: CallActionBody,
  ) {
    const user = getSocketUser(client);
    if (!user?.userId || !body?.toUserId || !body?.callId) {
      return { ok: false };
    }

    await this.callService.accept(user.userId, body.toUserId, body.callId);
    return { ok: true };
  }

  @SubscribeMessage('call:reject')
  async handleReject(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: CallActionBody,
  ) {
    const user = getSocketUser(client);
    if (!user?.userId || !body?.toUserId || !body?.callId) {
      return { ok: false };
    }

    await this.callService.reject(user.userId, body.toUserId, body.callId);
    return { ok: true };
  }

  @SubscribeMessage('call:cancel')
  async handleCancel(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: CallActionBody,
  ) {
    const user = getSocketUser(client);
    if (!user?.userId || !body?.toUserId || !body?.callId) {
      return { ok: false };
    }

    await this.callService.cancel(body.toUserId, body.callId);
    return { ok: true };
  }

  @SubscribeMessage('call:end')
  async handleEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: CallActionBody,
  ) {
    const user = getSocketUser(client);
    if (!user?.userId || !body?.toUserId || !body?.callId) {
      return { ok: false };
    }

    await this.callService.end(body.toUserId, body.callId);
    return { ok: true };
  }

  @SubscribeMessage('call:signal')
  async handleSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SignalBody,
  ) {
    const user = getSocketUser(client);
    if (!user?.userId || !body?.toUserId || !body?.callId || !body?.signal) {
      return { ok: false };
    }

    await this.callService.signal(
      user.userId,
      body.toUserId,
      body.callId,
      body.signal,
    );
    return { ok: true };
  }
}
