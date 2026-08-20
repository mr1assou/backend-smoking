import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppVersionModule } from './app-version/app-version.module';
import { ChatModule } from './chat/chat.module';
import { AuthModule } from './auth/auth.module';
import { UserProfilesModule } from './user-profiles/user-profiles.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PresenceModule } from './presence/presence.module';
import { PostsModule } from './posts/posts.module';
import { PrismaModule } from './prisma/prisma.module';
import { PushNotificationsModule } from './push-notifications/push-notifications.module';
import { RedisModule } from './redis/redis.module';
import { RelaxSoundsModule } from './relax-sounds/relax-sounds.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    AppVersionModule,
    PrismaModule,
    RedisModule,
    PresenceModule,
    LeaderboardModule,
    UserProfilesModule,
    AuthModule,
    StorageModule,
    PostsModule,
    ChatModule,
    NotificationsModule,
    RelaxSoundsModule,
    PushNotificationsModule,
  ],
})
export class AppModule {}
