import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FIRST_STEP_BADGE_ID } from './lib/badge.constants';

type DbClient = Prisma.TransactionClient | PrismaService;

export type UserStreakContext = {
  streakStart: Date | null;
  quitDate: Date | null;
  freedomPoints: number;
};

@Injectable()
export class BadgesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserBadgeContext(userId: number): Promise<UserStreakContext | null> {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        streakStart: true,
        quitDate: true,
        freedomPoints: true,
      },
    });
  }

  grantBadge(
    userId: number,
    badgeId: string,
    client: DbClient = this.prisma,
  ): Promise<void> {
    return client.userBadge
      .create({
        data: { user_id: userId, badge_id: badgeId },
      })
      .then(() => undefined)
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          return;
        }
        throw error;
      });
  }

  grantSignupBadge(
    userId: number,
    client: DbClient = this.prisma,
  ): Promise<void> {
    return this.grantBadge(userId, FIRST_STEP_BADGE_ID, client);
  }

  findEarnedBadgeIds(userId: number): Promise<string[]> {
    return this.prisma.userBadge
      .findMany({
        where: { user_id: userId },
        orderBy: { earned_at: 'asc' },
        select: { badge_id: true },
      })
      .then((rows) => rows.map((row) => row.badge_id));
  }
}
