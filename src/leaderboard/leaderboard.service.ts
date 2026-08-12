import { Injectable, NotFoundException } from '@nestjs/common';
import { BadgesService } from '../badges/badges.service';
import { FreedomPointsService } from '../freedom-points/freedom-points.service';
import { PresenceService } from '../presence/presence.service';
import { isSupportRole } from '../users/lib/user-roles';
import type { ListLeaderboardQueryDto } from './dto/list-leaderboard-query.dto';
import { resolveLeaderboardPagination } from './dto/list-leaderboard-query.dto';
import { mapLeaderboardPage } from './lib/leaderboard.mapper';
import { LeaderboardRepository } from './leaderboard.repository';
import type { LeaderboardResponse } from './types/leaderboard.types';

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly leaderboardRepository: LeaderboardRepository,
    private readonly presenceService: PresenceService,
    private readonly freedomPointsService: FreedomPointsService,
    private readonly badgesService: BadgesService,
  ) {}

  async getGlobalLeaderboard(
    viewerUserId: number,
    query: ListLeaderboardQueryDto = {},
  ): Promise<LeaderboardResponse> {
    const { offset, limit } = resolveLeaderboardPagination(query);

    // Sync once on the first page only — paging / Spot my rank must stay fast.
    if (offset === 0) {
      await this.freedomPointsService.syncSmokeFreeDayRewards(viewerUserId);
      await this.badgesService.syncEarnedBadges(viewerUserId);
    }
    const [totalUsers, page, viewerRow, viewerRole] = await Promise.all([
      this.leaderboardRepository.countEligibleUsers(),
      this.leaderboardRepository.findEligibleUsersPaginated(offset, limit),
      this.leaderboardRepository.findEligibleUserById(viewerUserId),
      this.leaderboardRepository.findUserRole(viewerUserId),
    ]);

    if (!viewerRow && !isSupportRole(viewerRole?.role)) {
      throw new NotFoundException('Viewer is not eligible for the leaderboard');
    }

    const viewerRank = viewerRow
      ? (await this.leaderboardRepository.countUsersRankedAhead(
          viewerUserId,
          viewerRow.freedomPoints,
        )) + 1
      : 0;

    const userIds = [
      ...new Set([viewerUserId, ...page.rows.map((row) => row.user_id)]),
    ];
    const [onlineById, badgeByUserId] = await Promise.all([
      this.presenceService.areOnline(userIds),
      this.badgesService.resolveHighestBadgeIdsByUserIds(userIds),
    ]);

    return mapLeaderboardPage(page.rows, {
      viewerUserId,
      viewerRow,
      viewerRank,
      onlineById,
      badgeByUserId,
      offset,
      limit,
      totalUsers,
      hasMore: page.hasMore,
    });
  }
}
