import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PresenceModule } from '../presence/presence.module';
import { RedisModule } from '../redis/redis.module';
import { StorageModule } from '../storage/storage.module';
import { PostsCacheRepository } from './posts-cache.repository';
import { PostsController } from './posts.controller';
import { PostsRepository } from './posts.repository';
import { PostsService } from './posts.service';

@Module({
  imports: [StorageModule, PresenceModule, RedisModule, NotificationsModule],
  controllers: [PostsController],
  providers: [PostsService, PostsRepository, PostsCacheRepository],
  exports: [PostsService],
})
export class PostsModule {}
