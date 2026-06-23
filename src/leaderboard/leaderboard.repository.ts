import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LEADERBOARD_ELIGIBLE_USER_WHERE } from './lib/leaderboard.filters';
import type { LeaderboardUserRow } from './types/leaderboard.types';

const LEADERBOARD_USER_SELECT = {
  user_id: true,
  username: true,
  country: true,
  countryFlag: true,
  image_url: true,
  freedomPoints: true,
} as const;

const LEADERBOARD_ORDER = [
  { freedomPoints: 'desc' as const },
  { user_id: 'asc' as const },
];

export type LeaderboardPageResult = {
  rows: LeaderboardUserRow[];
  hasMore: boolean;
};

@Injectable()
export class LeaderboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  countEligibleUsers(): Promise<number> {
    return this.prisma.user.count({
      where: LEADERBOARD_ELIGIBLE_USER_WHERE,
    });
  }

  findEligibleUsersPaginated(
    offset: number,
    limit: number,
  ): Promise<LeaderboardPageResult> {
    return this.prisma.user
      .findMany({
        where: LEADERBOARD_ELIGIBLE_USER_WHERE,
        orderBy: LEADERBOARD_ORDER,
        skip: offset,
        take: limit + 1,
        select: LEADERBOARD_USER_SELECT,
      })
      .then((rows) => {
        const hasMore = rows.length > limit;
        return {
          rows: hasMore ? rows.slice(0, limit) : rows,
          hasMore,
        };
      });
  }

  findEligibleUserById(userId: number): Promise<LeaderboardUserRow | null> {
    return this.prisma.user.findFirst({
      where: {
        ...LEADERBOARD_ELIGIBLE_USER_WHERE,
        user_id: userId,
      },
      select: LEADERBOARD_USER_SELECT,
    });
  }

  findUserRole(userId: number): Promise<{ role: string } | null> {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { role: true },
    });
  }

  /** Users ranked above the given player (same ordering as the leaderboard). */
  countUsersRankedAhead(
    userId: number,
    freedomPoints: number,
  ): Promise<number> {
    return this.prisma.user.count({
      where: {
        ...LEADERBOARD_ELIGIBLE_USER_WHERE,
        OR: [
          { freedomPoints: { gt: freedomPoints } },
          { freedomPoints, user_id: { lt: userId } },
        ],
      },
    });
  }
}
