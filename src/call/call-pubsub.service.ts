import { Injectable } from '@nestjs/common';

import { RedisService } from '../redis/redis.service';
import { CALL_EVENTS_CHANNEL } from './lib/call.redis-keys';
import type { CallOutboundEvent, CallRedisEvent } from './types/call.types';

@Injectable()
export class CallPubSubService {
  constructor(private readonly redis: RedisService) {}

  /** Publishes a signaling event addressed to a single user. */
  relay(targetUserId: number, event: CallOutboundEvent): Promise<number> {
    const message: CallRedisEvent = { targetUserId, ...event };
    return this.redis
      .getClient()
      .publish(CALL_EVENTS_CHANNEL, JSON.stringify(message));
  }
}
