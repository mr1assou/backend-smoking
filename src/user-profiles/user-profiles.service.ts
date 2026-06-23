import { Injectable, NotFoundException } from '@nestjs/common';
import { BadgesRepository } from '../badges/badges.repository';
import { highestEarnedBadgeId } from '../badges/lib/highest-earned-badge';
import { PostsService } from '../posts/posts.service';
import type { FeedPageResponse } from '../posts/types/feed-page';
import { toUtcIso } from '../common/utc-instant';
import { PresenceService } from '../presence/presence.service';
import { UserProfilesRepository } from './user-profiles.repository';
import type {
  UserPresenceResponse,
  UserProfileCommentsPage,
  UserSearchResponse,
  UserStreakResponse,
} from './types/user-profile.types';
import { normalizeUsernameSearchQuery } from './lib/normalize-username-search';

@Injectable()
export class UserProfilesService {
  constructor(
    private readonly profilesRepository: UserProfilesRepository,
    private readonly postsService: PostsService,
    private readonly presenceService: PresenceService,
    private readonly badgesRepository: BadgesRepository,
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

  async searchUsers(
    viewerUserId: number,
    rawUsername: string,
  ): Promise<UserSearchResponse> {
    const username = normalizeUsernameSearchQuery(rawUsername);
    const rows = await this.profilesRepository.searchNormalUsersByUsername(
      viewerUserId,
      username,
    );

    const userIds = rows.map((row) => row.user_id);
    const [onlineById, badgesByUser] = await Promise.all([
      this.presenceService.areOnline(userIds),
      this.badgesRepository.findEarnedBadgeIdsByUserIds(userIds),
    ]);

    return {
      items: rows.map((row) => ({
        user_id: row.user_id,
        username: row.username?.trim() ?? '',
        image_url: row.image_url,
        country_flag: row.countryFlag,
        country: row.country,
        badge_id: highestEarnedBadgeId(badgesByUser.get(row.user_id) ?? []),
        is_online: onlineById[row.user_id] === true,
      })),
    };
  }
}
