import { Injectable } from '@nestjs/common';
import { PresenceService } from '../presence/presence.service';
import { filterLeaderboardUsers } from './lib/leaderboard.filters';
import { mapLeaderboardResponse } from './lib/leaderboard.mapper';
import { LeaderboardRepository } from './leaderboard.repository';
import type { LeaderboardResponse } from './types/leaderboard.types';

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly leaderboardRepository: LeaderboardRepository,
    private readonly presenceService: PresenceService,
  ) {}

  async getGlobalLeaderboard(viewerUserId: number): Promise<LeaderboardResponse> {
    const rows = filterLeaderboardUsers(
      await this.leaderboardRepository.findRegisteredUsers(),
    );
    const userIds = rows.map((row) => row.user_id);
    const onlineById = await this.presenceService.areOnline(userIds);

    return mapLeaderboardResponse(rows, { viewerUserId, onlineById });
  }
}
