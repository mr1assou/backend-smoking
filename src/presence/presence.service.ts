import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { PresenceRepository } from './presence.repository';
import type {
  PresenceConnectResult,
  PresenceDisconnectResult,
} from './types/presence.types';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private broadcaster?: (userId: number, isOnline: boolean) => void;

  constructor(
    private readonly presenceRepository: PresenceRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  setBroadcaster(handler: (userId: number, isOnline: boolean) => void) {
    this.broadcaster = handler;
  }

  private emitPresence(userId: number, isOnline: boolean) {
    this.broadcaster?.(userId, isOnline);
  }

  async connect(
    userId: number,
    socketId: string,
  ): Promise<PresenceConnectResult> {
    const wasOnline = await this.presenceRepository.hasOpenSockets(userId);
    await this.presenceRepository.registerSocket(userId, socketId);
    return { wentOnline: !wasOnline };
  }

  async disconnect(socketId: string): Promise<PresenceDisconnectResult> {
    const userId = await this.presenceRepository.resolveSocketUserId(socketId);
    if (!userId) {
      return { userId: null, wentOffline: false };
    }

    const remaining = await this.presenceRepository.removeSocket(
      socketId,
      userId,
    );
    if (remaining > 0) {
      return { userId, wentOffline: false };
    }

    await this.presenceRepository.clearUserPresence(userId);
    return { userId, wentOffline: true };
  }

  /** Force-offline on explicit logout (all sockets for this user). */
  async disconnectAllForUser(userId: number): Promise<boolean> {
    const socketIds = await this.presenceRepository.listSocketIds(userId);

    if (socketIds.length === 0) {
      return this.presenceRepository.removeFromOnlineSet(userId);
    }

    await this.presenceRepository.clearUserPresence(userId);
    return true;
  }

  areOnline(userIds: number[]): Promise<Record<number, boolean>> {
    return this.presenceRepository.areOnline(userIds);
  }

  isOnline(userId: number): Promise<boolean> {
    return this.presenceRepository.isOnline(userId);
  }

  getOnlineUserIds(): Promise<number[]> {
    return this.presenceRepository.listOnlineUserIds();
  }

  async markOffline(userId: number): Promise<void> {
    const wasOnline = await this.disconnectAllForUser(userId);
    await this.usersRepository.updateLastOfflineAt(userId, new Date());
    if (wasOnline) {
      this.emitPresence(userId, false);
    }
  }

  async markOfflineIfDisconnected(
    userId: number,
    wentOffline: boolean,
  ): Promise<void> {
    if (!wentOffline) return;
    try {
      await this.usersRepository.updateLastOfflineAt(userId, new Date());
    } catch (error) {
      this.logger.warn(
        `Failed to persist last_offline_at for user ${userId}`,
        error,
      );
    }
  }
}
