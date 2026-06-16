import { Injectable, NotFoundException } from '@nestjs/common';
import { PostsService } from '../posts/posts.service';
import type { FeedPageResponse } from '../posts/types/feed-page';
import { toUtcIso } from '../common/utc-instant';
import { PresenceService } from '../presence/presence.service';
import { UserProfilesRepository } from './user-profiles.repository';
import type {
  UserPresenceResponse,
  UserProfileCommentsPage,
  UserStreakResponse,
} from './types/user-profile.types';

@Injectable()
export class UserProfilesService {
  constructor(
    private readonly profilesRepository: UserProfilesRepository,
    private readonly postsService: PostsService,
    private readonly presenceService: PresenceService,
  ) {}

  private async requireUser(userId: number) {
    const user = await this.profilesRepository.findPublicUser(userId);
    if (!user?.username?.trim()) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getStreak(userId: number): Promise<UserStreakResponse> {
    await this.requireUser(userId);
    const stats = await this.profilesRepository.getStreakStats(userId);
    if (!stats) throw new NotFoundException('User not found');
    return stats;
  }

  async getPresence(userId: number): Promise<UserPresenceResponse> {
    await this.requireUser(userId);
    const [meta, is_online] = await Promise.all([
      this.profilesRepository.findPresenceMeta(userId),
      this.presenceService.isOnline(userId),
    ]);
    if (!meta) throw new NotFoundException('User not found');

    return {
      user_id: userId,
      is_online,
      last_offline_at: meta.last_offline_at
        ? toUtcIso(meta.last_offline_at)
        : null,
    };
  }

  async listPosts(
    userId: number,
    viewerUserId: number,
    offset = 0,
  ): Promise<FeedPageResponse> {
    await this.requireUser(userId);
    return this.postsService.listPostsByAuthor(userId, viewerUserId, offset);
  }

  async listComments(
    userId: number,
    offset = 0,
  ): Promise<UserProfileCommentsPage> {
    await this.requireUser(userId);
    return this.postsService.listCommentsByAuthor(userId, offset);
  }

  async listUpvotedPosts(
    userId: number,
    viewerUserId: number,
    offset = 0,
  ): Promise<FeedPageResponse> {
    await this.requireUser(userId);
    return this.postsService.listUpvotedPostsByUser(
      userId,
      viewerUserId,
      offset,
    );
  }
}
