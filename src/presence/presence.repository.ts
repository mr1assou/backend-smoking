import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import {
  PRESENCE_ONLINE_SET,
  presenceSocketUserKey,
  presenceUserSocketsKey,
} from './lib/presence.redis-keys';

@Injectable()
export class PresenceRepository {
  constructor(private readonly redis: RedisService) {}

  private client() {
    return this.redis.getClient();
  }

  async hasOpenSockets(userId: number): Promise<boolean> {
    return (await this.client().scard(presenceUserSocketsKey(userId))) > 0;
  }

  async registerSocket(userId: number, socketId: string): Promise<void> {
    await this.client()
      .multi()
      .sadd(presenceUserSocketsKey(userId), socketId)
      .set(presenceSocketUserKey(socketId), String(userId))
      .sadd(PRESENCE_ONLINE_SET, String(userId))
      .exec();
  }

  async resolveSocketUserId(socketId: string): Promise<number | null> {
    const userIdStr = await this.client().get(presenceSocketUserKey(socketId));
    if (!userIdStr) return null;

    const userId = Number(userIdStr);
    return Number.isFinite(userId) && userId > 0 ? userId : null;
  }

  async removeSocket(socketId: string, userId: number): Promise<number> {
    await this.client()
      .multi()
      .del(presenceSocketUserKey(socketId))
      .srem(presenceUserSocketsKey(userId), socketId)
      .exec();

    return this.client().scard(presenceUserSocketsKey(userId));
  }

  async clearUserPresence(userId: number): Promise<void> {
    const userIdStr = String(userId);
    const socketsKey = presenceUserSocketsKey(userId);
    const socketIds = await this.client().smembers(socketsKey);

    const pipeline = this.client().pipeline();
    for (const socketId of socketIds) {
      pipeline.del(presenceSocketUserKey(socketId));
    }
    pipeline.del(socketsKey);
    pipeline.srem(PRESENCE_ONLINE_SET, userIdStr);
    await pipeline.exec();
  }

  async removeFromOnlineSet(userId: number): Promise<boolean> {
    const wasMember = await this.client().sismember(PRESENCE_ONLINE_SET, String(userId));
    if (!wasMember) return false;
    await this.client().srem(PRESENCE_ONLINE_SET, String(userId));
    return true;
  }

  async listSocketIds(userId: number): Promise<string[]> {
    return this.client().smembers(presenceUserSocketsKey(userId));
  }

  async isOnline(userId: number): Promise<boolean> {
    return (await this.client().sismember(PRESENCE_ONLINE_SET, String(userId))) === 1;
  }

  async areOnline(userIds: number[]): Promise<Record<number, boolean>> {
    const unique = [...new Set(userIds.filter((id) => Number.isFinite(id) && id > 0))];
    const out: Record<number, boolean> = {};
    if (unique.length === 0) return out;

    const pipeline = this.client().pipeline();
    for (const id of unique) {
      pipeline.sismember(PRESENCE_ONLINE_SET, String(id));
    }
    const results = await pipeline.exec();

    unique.forEach((id, index) => {
      out[id] = results?.[index]?.[1] === 1;
    });

    return out;
  }

  async listOnlineUserIds(): Promise<number[]> {
    const members = await this.client().smembers(PRESENCE_ONLINE_SET);
    return members
      .map((value) => Number.parseInt(value, 10))
      .filter((id) => Number.isFinite(id) && id > 0);
  }
}
