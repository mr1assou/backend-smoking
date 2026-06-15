import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { LeaderboardUserRow } from './types/leaderboard.types';

const LEADERBOARD_USER_SELECT = {
  user_id: true,
  username: true,
  country: true,
  countryFlag: true,
  image_url: true,
} as const;

@Injectable()
export class LeaderboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  findRegisteredUsers(): Promise<LeaderboardUserRow[]> {
    return this.prisma.user.findMany({
      where: { username: { not: null } },
      orderBy: { user_id: 'asc' },
      select: LEADERBOARD_USER_SELECT,
    });
  }
}
