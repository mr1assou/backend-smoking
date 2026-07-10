import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { BadgesModule } from '../badges/badges.module';
import { PresenceModule } from '../presence/presence.module';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';
import { UsersModule } from '../users/users.module';
import { CallGateway } from './call.gateway';
import { CallPubSubService } from './call-pubsub.service';
import { CallService } from './call.service';

@Module({
  imports: [
    JwtModule.register({}),
    BadgesModule,
    UsersModule,
    PresenceModule,
    PushNotificationsModule,
  ],
  providers: [CallService, CallPubSubService, CallGateway],
})
export class CallModule {}
