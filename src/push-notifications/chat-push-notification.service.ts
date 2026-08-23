import { Injectable, Logger } from '@nestjs/common';

import type { ChatMessageType } from '../chat/types/chat.types';
import { PresenceService } from '../presence/presence.service';
import { ExpoPushClient } from './clients/expo-push.client';
import { buildChatPushCopy } from './lib/build-chat-push-copy';
import { resolvePushLocale } from './lib/push-locale';
import { PushNotificationsRepository } from './push-notifications.repository';

export type ChatPushMessageParams = {
  recipientUserId: number;
  senderUserId: number;
  senderUsername: string | null;
  threadId: number;
  messageType: ChatMessageType;
  text: string | null;
};

@Injectable()
export class ChatPushNotificationService {
  private readonly logger = new Logger(ChatPushNotificationService.name);

  constructor(
    private readonly repository: PushNotificationsRepository,
    private readonly presence: PresenceService,
    private readonly expoPush: ExpoPushClient,
  ) {}

  /** Sends an OS push when the recipient has no active presence connection. */
  async notifyNewMessageIfOffline(
    params: ChatPushMessageParams,
  ): Promise<void> {
    try {
      const online = await this.presence.isOnline(params.recipientUserId);
      if (online) return;

      const tokens = await this.repository.listPushTokensForUser(
        params.recipientUserId,
      );
      if (tokens.length === 0) return;

      const locale = resolvePushLocale(
        await this.repository.getUserLocale(params.recipientUserId),
      );
      const copy = buildChatPushCopy({
        senderUsername: params.senderUsername,
        messageType: params.messageType,
        text: params.text,
        locale,
      });

      await this.expoPush.sendBatch(
        tokens.map((token) => ({
          to: token,
          title: copy.title,
          body: copy.body,
          data: {
            type: 'chat',
            threadId: params.threadId,
            senderUserId: params.senderUserId,
          },
        })),
      );
    } catch (error) {
      this.logger.warn(
        `Chat push failed for user ${params.recipientUserId}`,
        error,
      );
    }
  }
}
