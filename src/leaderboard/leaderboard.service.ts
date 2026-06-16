import { Injectable, NotFoundException } from '@nestjs/common';
import { BadgesService } from '../badges/badges.service';
import { FreedomPointsService } from '../freedom-points/freedom-points.service';
import { PresenceService } from '../presence/presence.service';
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
    await this.freedomPointsService.syncSmokeFreeDayRewards(viewerUserId);
    await this.badgesService.syncEarnedBadges(viewerUserId);

    const { offset, limit } = resolveLeaderboardPagination(query);
    const [totalUsers, page, viewerRow] = await Promise.all([
      this.leaderboardRepository.countEligibleUsers(),
      this.leaderboardRepository.findEligibleUsersPaginated(offset, limit),
      this.leaderboardRepository.findEligibleUserById(viewerUserId),
    ]);

    if (!viewerRow) {
      throw new NotFoundException('Viewer is not eligible for the leaderboard');
    }

    const viewerRank =
      (await this.leaderboardRepository.countUsersRankedAhead(
        viewerUserId,
        viewerRow.freedomPoints,
      )) + 1;

    const userIds = [
      ...new Set([viewerUserId, ...page.rows.map((row) => row.user_id)]),
    ];
    const onlineById = await this.presenceService.areOnline(userIds);

    return mapLeaderboardPage(page.rows, {
      viewerUserId,
      viewerRow,
      viewerRank,
      onlineById,
      offset,
      limit,
      totalUsers,
      hasMore: page.hasMore,
    });
  }
}
