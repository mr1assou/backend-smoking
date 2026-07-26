import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import {
  PUSH_SCHEDULE,
  PUSH_TIMEZONE,
} from './constants/push-notification.constants';
import { PushNotificationsService } from './push-notifications.service';

@Injectable()
export class PushNotificationsCron {
  private readonly logger = new Logger(PushNotificationsCron.name);

  constructor(
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  @Cron(PUSH_SCHEDULE.streak.cron, {
    name: 'push-streak',
    timeZone: PUSH_TIMEZONE,
  })
  handleStreakPush(): void {
    this.logger.debug(`Running ${PUSH_SCHEDULE.streak.label}`);
    void this.pushNotificationsService.sendPushToSubscribers('streak');
  }

  /** 12:30 PM Eastern — was local-only; now Expo push. */
  @Cron(PUSH_SCHEDULE.tip.cron, {
    name: 'push-tip',
    timeZone: PUSH_TIMEZONE,
  })
  handleTipPush(): void {
    this.logger.debug(`Running ${PUSH_SCHEDULE.tip.label}`);
    void this.pushNotificationsService.sendPushToSubscribers('tip');
  }

  @Cron(PUSH_SCHEDULE.money.cron, {
    name: 'push-money',
    timeZone: PUSH_TIMEZONE,
  })
  handleMoneyPush(): void {
    this.logger.debug(`Running ${PUSH_SCHEDULE.money.label}`);
    void this.pushNotificationsService.sendPushToSubscribers('money');
  }

  /** 8:30 PM Eastern — was local-only; now Expo push. */
  @Cron(PUSH_SCHEDULE.motivation.cron, {
    name: 'push-motivation',
    timeZone: PUSH_TIMEZONE,
  })
  handleMotivationPush(): void {
    this.logger.debug(`Running ${PUSH_SCHEDULE.motivation.label}`);
    void this.pushNotificationsService.sendPushToSubscribers('motivation');
  }
}
