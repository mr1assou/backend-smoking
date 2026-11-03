import { Module } from '@nestjs/common';
import { BadgesModule } from '../badges/badges.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PresenceModule } from '../presence/presence.module';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';
import { RedisModule } from '../redis/redis.module';
import { StorageModule } from '../storage/storage.module';
import { PostsCacheModule } from './posts-cache.module';
import { PostsController } from './posts.controller';
import { PostsRepository } from './posts.repository';
import { PostsService } from './posts.service';

@Module({
  imports: [
    BadgesModule,
    StorageModule,
    PresenceModule,
    RedisModule,
    NotificationsModule,
    PushNotificationsModule,
    PostsCacheModule,
  ],
  controllers: [PostsController],
  providers: [PostsService, PostsRepository],
  exports: [PostsService],
})
export class PostsModule {}
