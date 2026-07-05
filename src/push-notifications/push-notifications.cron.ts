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

  @Cron(PUSH_SCHEDULE.money.cron, {
    name: 'push-money',
    timeZone: PUSH_TIMEZONE,
  })
  handleMoneyPush(): void {
    this.logger.debug(`Running ${PUSH_SCHEDULE.money.label}`);
    void this.pushNotificationsService.sendPushToSubscribers('money');
  }
}
