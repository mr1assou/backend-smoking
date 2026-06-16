import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { CHAT_EVENTS_CHANNEL } from './lib/chat.redis-keys';
import type { ChatRedisEvent } from './types/chat.types';

@Injectable()
export class ChatPubSubService {
  constructor(private readonly redis: RedisService) {}

  publish(event: ChatRedisEvent): Promise<number> {
    return this.redis
      .getClient()
      .publish(CHAT_EVENTS_CHANNEL, JSON.stringify(event));
  }
}
