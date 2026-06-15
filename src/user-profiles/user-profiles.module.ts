import { Module } from '@nestjs/common';
import { PostsModule } from '../posts/posts.module';
import { PresenceModule } from '../presence/presence.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserProfilesController } from './user-profiles.controller';
import { UserProfilesRepository } from './user-profiles.repository';
import { UserProfilesService } from './user-profiles.service';

@Module({
  imports: [PrismaModule, PostsModule, PresenceModule],
  controllers: [UserProfilesController],
  providers: [UserProfilesRepository, UserProfilesService],
})
export class UserProfilesModule {}
