import { Injectable, Logger } from '@nestjs/common';

import type { CallKind } from '../call/types/call.types';
import { ExpoPushClient } from './clients/expo-push.client';
import { PushNotificationsRepository } from './push-notifications.repository';

export type IncomingCallPushParams = {
  recipientUserId: number;
  callerUserId: number;
  callerName: string | null;
  callId: string;
  kind: CallKind;
};

@Injectable()
export class CallPushNotificationService {
  private readonly logger = new Logger(CallPushNotificationService.name);

  constructor(
    private readonly repository: PushNotificationsRepository,
    private readonly expoPush: ExpoPushClient,
  ) {}

  /** Notifies a recipient whose app is closed that someone is calling them. */
  async notifyIncomingCall(params: IncomingCallPushParams): Promise<void> {
    try {
      const tokens = await this.repository.listPushTokensForUser(
        params.recipientUserId,
      );
      if (tokens.length === 0) return;

      const caller = params.callerName?.trim() || 'Someone';
      const callLabel = params.kind === 'video' ? 'video call' : 'voice call';

      await this.expoPush.sendBatch(
        tokens.map((token) => ({
          to: token,
          title: 'Incoming call',
          body: `${caller} is calling you (${callLabel})`,
          data: {
            type: 'call',
            callId: params.callId,
            callerUserId: params.callerUserId,
            kind: params.kind,
          },
        })),
      );
    } catch (error) {
      this.logger.warn(
        `Incoming-call push failed for user ${params.recipientUserId}`,
        error,
      );
    }
  }
}
