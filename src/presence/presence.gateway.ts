import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Server, Socket } from 'socket.io';
import { verifyPresenceSocketUser } from './lib/socket-auth';
import { PresenceService } from './presence.service';

@WebSocketGateway({
  namespace: '/presence',
  cors: { origin: true, credentials: true },
})
export class PresenceGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(PresenceGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly presence: PresenceService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.presence.setBroadcaster((userId, isOnline) => {
      this.broadcastPresence(userId, isOnline);
    });
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

    client.data.user = user;

    try {
      const { wentOnline } = await this.presence.connect(
        user.userId,
        client.id,
      );
      await this.emitSnapshot(client);

      if (wentOnline) {
        this.broadcastPresence(user.userId, true);
      }
    } catch (error) {
      this.logger.error(
        `Presence connect failed for user ${user.userId}`,
        error,
      );
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const { userId, wentOffline } = await this.presence.disconnect(client.id);
      if (!userId || !wentOffline) return;

      await this.presence.markOfflineIfDisconnected(userId, true);
      this.broadcastPresence(userId, false);
    } catch (error) {
      this.logger.error(
        `Presence disconnect failed for socket ${client.id}`,
        error,
      );
    }
  }

  @SubscribeMessage('presence:heartbeat')
  handleHeartbeat() {
    return { ok: true };
  }

  @SubscribeMessage('presence:leave')
  async handleLeave(@ConnectedSocket() client: Socket) {
    const userId = client.data.user?.userId;
    if (!userId) return { ok: false };

    await this.presence.markOffline(userId);
    return { ok: true };
  }

  @SubscribeMessage('presence:sync')
  async handleSync(@ConnectedSocket() client: Socket) {
    await this.emitSnapshot(client);
    return { ok: true };
  }

  private async emitSnapshot(client: Socket) {
    const onlineUserIds = await this.presence.getOnlineUserIds();
    client.emit('presence:snapshot', { onlineUserIds });
  }

  private broadcastPresence(userId: number, isOnline: boolean) {
    this.server.emit('presence:update', { userId, isOnline });
  }
}
