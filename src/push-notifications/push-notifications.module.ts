import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PresenceModule } from '../presence/presence.module';
import { ChatPushNotificationService } from './chat-push-notification.service';
import { ExpoPushClient } from './clients/expo-push.client';
import { PushNotificationsCron } from './push-notifications.cron';
import { PushNotificationsRepository } from './push-notifications.repository';
import { PushNotificationsService } from './push-notifications.service';

@Module({
  imports: [PrismaModule, PresenceModule],
  providers: [
    PushNotificationsRepository,
    ExpoPushClient,
    PushNotificationsService,
    ChatPushNotificationService,
    PushNotificationsCron,
  ],
  exports: [ChatPushNotificationService],
})
export class PushNotificationsModule {}
