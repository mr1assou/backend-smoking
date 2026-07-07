import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import type { Server, Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';
import {
  verifyPresenceSocketUser,
  setSocketUser,
} from '../presence/lib/socket-auth';
import {
  NOTIFICATION_EVENTS_CHANNEL,
  notificationUserRoom,
} from './lib/notifications.redis-keys';
import type { NotificationRedisEvent } from './types/notification.types';

@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: true, credentials: true },
})
export class NotificationsGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  private readonly logger = new Logger(NotificationsGateway.name);
  private subscriber: Redis | null = null;

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit() {
    this.subscriber = this.redis.getClient().duplicate();
    void this.subscriber.subscribe(NOTIFICATION_EVENTS_CHANNEL);
    this.subscriber.on('message', (_, raw) => {
      try {
        const event = JSON.parse(raw) as NotificationRedisEvent;
        this.handleRedisEvent(event);
      } catch (error) {
        this.logger.error('Failed to handle notification Redis event', error);
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
    await client.join(notificationUserRoom(user.userId));
  }

  handleDisconnect(client: Socket): void {
    void client.id;
  }

  private handleRedisEvent(event: NotificationRedisEvent) {
    if (event.type !== 'notification:new') return;
    this.server
      .to(notificationUserRoom(event.recipient_id))
      .emit('notification:new', event.payload);
  }
}
