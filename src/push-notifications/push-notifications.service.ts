import { Injectable, Logger } from '@nestjs/common';

import {
  elapsedSmokeFreeMs,
  smokeFreeDaysFromInstant,
  smokeFreeDaysInProgressFromInstant,
} from '../common/smoke-free-days';
import { utcInstantNow } from '../common/utc-instant';
import { ExpoPushClient } from './clients/expo-push.client';
import { buildRotatingPushCopy } from './copy/build-rotating-push-copy';
import { computePushMoneySaved } from './copy/compute-push-money-saved';
import { PushNotificationsRepository } from './push-notifications.repository';
import { dailyContentSlot, type PushKind } from './rotation/push-rotation';

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);
  private running = false;

  constructor(
    private readonly repository: PushNotificationsRepository,
    private readonly expoPush: ExpoPushClient,
  ) {}

  async sendPushToSubscribers(kind: PushKind): Promise<void> {
    if (this.running) {
      this.logger.debug('Push job already running — skipped');
      return;
    }

    this.running = true;
    try {
      const recipients = await this.repository.listStreakPushRecipients();
      if (recipients.length === 0) {
        this.logger.debug('No push tokens — push skipped');
        return;
      }

      const now = utcInstantNow();
      const contentSlot = dailyContentSlot(now);
      const moneyContextByUserId =
        kind === 'money'
          ? await this.repository.listMoneyContextByUserId(
              [...new Set(recipients.map((recipient) => recipient.userId))],
              now,
            )
          : new Map();

      const messages = recipients.map((recipient) => {
        const elapsedMs = elapsedSmokeFreeMs(
          recipient.streakStart,
          recipient.quitDate,
          now,
        );
        const copy = buildRotatingPushCopy({
          recipient,
          kind,
          streakDays: smokeFreeDaysFromInstant(
            recipient.streakStart,
            recipient.quitDate,
            now,
          ),
          streakDaysInProgress: smokeFreeDaysInProgressFromInstant(
            recipient.streakStart,
            recipient.quitDate,
            now,
          ),
          elapsedMs,
          contentSlot,
          moneySaved:
            kind === 'money'
              ? computePushMoneySaved(
                  recipient,
                  elapsedMs,
                  now,
                  moneyContextByUserId.get(recipient.userId),
                )
              : undefined,
        });

        return {
          to: recipient.token,
          title: copy.title,
          body: copy.body,
          data: {
            userId: recipient.userId,
            kind: copy.kind,
            streakDays: smokeFreeDaysInProgressFromInstant(
              recipient.streakStart,
              recipient.quitDate,
              now,
            ),
          },
        };
      });

      await this.expoPush.sendBatch(messages);
      this.logger.log(`Sent ${messages.length} ${kind} push notification(s)`);
    } catch (error) {
      this.logger.error(`${kind} push job failed`, error);
    } finally {
      this.running = false;
    }
  }
}
