import { Injectable, Logger } from '@nestjs/common';

import { ExpoPushClient } from './clients/expo-push.client';
import { buildPostModerationPushCopy } from './lib/post-moderation-push-copy';
import { resolvePushLocale } from './lib/push-locale';
import { PushNotificationsRepository } from './push-notifications.repository';

export type PostModerationPushParams = {
  authorUserId: number;
  postId: number;
};

@Injectable()
export class PostModerationPushNotificationService {
  private readonly logger = new Logger(
    PostModerationPushNotificationService.name,
  );

  constructor(
    private readonly repository: PushNotificationsRepository,
    private readonly expoPush: ExpoPushClient,
  ) {}

  async notifyPostRemoved(params: PostModerationPushParams): Promise<void> {
    try {
      const tokens = await this.repository.listPushTokensForUser(
        params.authorUserId,
      );
      if (tokens.length === 0) return;

      const copy = buildPostModerationPushCopy(
        resolvePushLocale(
          await this.repository.getUserLocale(params.authorUserId),
        ),
      );

      await this.expoPush.sendBatch(
        tokens.map((token) => ({
          to: token,
          title: copy.title,
          body: copy.body,
          data: {
            type: 'post_moderated',
            postId: params.postId,
          },
        })),
      );
    } catch (error) {
      this.logger.warn(
        `Post moderation push failed for user ${params.authorUserId}`,
        error,
      );
    }
  }
}
