import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { NOTIFICATION_EVENTS_CHANNEL } from './lib/notifications.redis-keys';
import type { NotificationRedisEvent } from './types/notification.types';

@Injectable()
export class NotificationsPubSubService {
  constructor(private readonly redis: RedisService) {}

  publish(event: NotificationRedisEvent): Promise<number> {
    return this.redis
      .getClient()
      .publish(NOTIFICATION_EVENTS_CHANNEL, JSON.stringify(event));
  }
}
