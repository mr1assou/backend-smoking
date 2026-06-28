import { Injectable, Logger } from '@nestjs/common';

import { PresenceService } from '../presence/presence.service';
import { CallPushNotificationService } from '../push-notifications/call-push-notification.service';
import { RedisService } from '../redis/redis.service';
import { UsersRepository } from '../users/users.repository';
import { CallPubSubService } from './call-pubsub.service';
import {
  PENDING_CALL_TTL_SECONDS,
  pendingCallKey,
} from './lib/call.redis-keys';
import type {
  CallKind,
  CallSignal,
  IncomingCallPayload,
  PendingCall,
} from './types/call.types';

@Injectable()
export class CallService {
  private readonly logger = new Logger(CallService.name);

  constructor(
    private readonly pubSub: CallPubSubService,
    private readonly presence: PresenceService,
    private readonly usersRepository: UsersRepository,
    private readonly callPush: CallPushNotificationService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Starts a call: relays an incoming-call event to the recipient, stores it
   * so it survives a cold start, and sends a push when they are offline.
   */
  async invite(
    callerUserId: number,
    recipientUserId: number,
    callId: string,
    kind: CallKind,
  ): Promise<void> {
    const caller = await this.usersRepository.findById(callerUserId);

    const incoming: IncomingCallPayload = {
      callId,
      kind,
      fromUserId: callerUserId,
      callerName: caller?.username ?? null,
      callerAvatarUrl: caller?.image_url ?? null,
      callerCountryFlag: caller?.countryFlag ?? null,
    };

    await this.storePendingCall(recipientUserId, incoming);
    await this.pubSub.relay(recipientUserId, {
      event: 'call:incoming',
      payload: incoming,
    });

    const online = await this.presence.isOnline(recipientUserId);
    if (!online) {
      await this.callPush.notifyIncomingCall({
        recipientUserId,
        callerUserId,
        callerName: incoming.callerName,
        callId,
        kind,
      });
    }
  }

  /** Recipient accepted: clear their pending invite, tell the caller. */
  async accept(
    recipientUserId: number,
    callerUserId: number,
    callId: string,
  ): Promise<void> {
    await this.clearPendingCall(recipientUserId, callId);
    await this.pubSub.relay(callerUserId, {
      event: 'call:accepted',
      payload: { callId },
    });
  }

  /** Recipient declined: clear their pending invite, tell the caller. */
  async reject(
    recipientUserId: number,
    callerUserId: number,
    callId: string,
  ): Promise<void> {
    await this.clearPendingCall(recipientUserId, callId);
    await this.pubSub.relay(callerUserId, {
      event: 'call:rejected',
      payload: { callId },
    });
  }

  /** Caller hung up before the recipient answered. */
  async cancel(
    recipientUserId: number,
    callId: string,
  ): Promise<void> {
    await this.clearPendingCall(recipientUserId, callId);
    await this.pubSub.relay(recipientUserId, {
      event: 'call:canceled',
      payload: { callId },
    });
  }

  /** Either side ended an in-progress call. */
  async end(peerUserId: number, callId: string): Promise<void> {
    await this.pubSub.relay(peerUserId, {
      event: 'call:ended',
      payload: { callId },
    });
  }

  /** Relays a WebRTC offer/answer/ICE candidate to the other peer verbatim. */
  async signal(
    fromUserId: number,
    toUserId: number,
    callId: string,
    signal: CallSignal,
  ): Promise<void> {
    await this.pubSub.relay(toUserId, {
      event: 'call:signal',
      payload: { callId, fromUserId, signal },
    });
  }

  /** Returns a pending invite so a (re)connecting client can start ringing. */
  async getPendingCall(recipientUserId: number): Promise<PendingCall | null> {
    try {
      const raw = await this.redis
        .getClient()
        .get(pendingCallKey(recipientUserId));
      return raw ? (JSON.parse(raw) as PendingCall) : null;
    } catch (error) {
      this.logger.warn(
        `Failed to read pending call for user ${recipientUserId}`,
        error,
      );
      return null;
    }
  }

  private async storePendingCall(
    recipientUserId: number,
    incoming: IncomingCallPayload,
  ): Promise<void> {
    try {
      await this.redis
        .getClient()
        .set(
          pendingCallKey(recipientUserId),
          JSON.stringify(incoming),
          'EX',
          PENDING_CALL_TTL_SECONDS,
        );
    } catch (error) {
      this.logger.warn(
        `Failed to store pending call for user ${recipientUserId}`,
        error,
      );
    }
  }

  /** Clears the pending invite only if it still matches this call id. */
  private async clearPendingCall(
    recipientUserId: number,
    callId: string,
  ): Promise<void> {
    try {
      const pending = await this.getPendingCall(recipientUserId);
      if (pending && pending.callId !== callId) return;
      await this.redis.getClient().del(pendingCallKey(recipientUserId));
    } catch (error) {
      this.logger.warn(
        `Failed to clear pending call for user ${recipientUserId}`,
        error,
      );
    }
  }
}
