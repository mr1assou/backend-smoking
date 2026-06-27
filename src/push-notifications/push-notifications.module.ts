import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ExpoPushClient } from './clients/expo-push.client';
import { PushNotificationsCron } from './push-notifications.cron';
import { PushNotificationsRepository } from './push-notifications.repository';
import { PushNotificationsService } from './push-notifications.service';

@Module({
  imports: [PrismaModule],
  providers: [
    PushNotificationsRepository,
    ExpoPushClient,
    PushNotificationsService,
    PushNotificationsCron,
  ],
})
export class PushNotificationsModule {}
