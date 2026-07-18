import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toUtcIso } from '../common/utc-instant';
import { DEFAULT_USER_ROLE } from '../users/lib/user-roles';
import { USERNAME_SEARCH_RESULT_LIMIT } from './lib/normalize-username-search';

export type UserStreakStats = {
  streak_start: string | null;
  attempt_number: number;
  max_duration_ms: number;
  member_since: string;
};

@Injectable()
export class UserProfilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPublicUser(userId: number) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        username: true,
        streakStart: true,
        quitDate: true,
        createdAt: true,
      },
    });
  }

  findPresenceMeta(userId: number) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { user_id: true, last_offline_at: true },
    });
  }

  findRoleAndStatus(userId: number) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { user_id: true, role: true, status: true },
    });
  }

  /** Blocks/unblocks the account and revokes its refresh token when blocking. */
  setUserStatus(userId: number, status: 'active' | 'blocked') {
    return this.prisma.user.update({
      where: { user_id: userId },
      data: {
        status,
        ...(status === 'blocked' ? { hashedRefreshToken: null } : {}),
      },
      select: { user_id: true, status: true },
    });
  }

  async getStreakStats(userId: number): Promise<UserStreakStats | null> {
    const user = await this.findPublicUser(userId);
    if (!user) return null;

    const attempts = await this.prisma.quitAttempt.findMany({
      where: { user_id: userId },
      orderBy: { attemptNumber: 'desc' },
      select: {
        attemptNumber: true,
        startedAt: true,
        endedAt: true,
        durationSeconds: true,
        closingSlipEvent: {
          select: { previousStreakStart: true },
        },
      },
    });

    const now = Date.now();
    const streakStart = user.streakStart ?? user.quitDate;
    const activeStartMs =
      streakStart?.getTime() ??
      attempts.find((attempt) => attempt.endedAt === null)?.startedAt.getTime();
    let maxDurationMs = 0;

    for (const attempt of attempts) {
      const durationSeconds = this.resolveAttemptDurationSeconds(
        attempt,
        activeStartMs,
        now,
      );
      maxDurationMs = Math.max(maxDurationMs, durationSeconds * 1000);
    }

    const active = attempts.find((attempt) => attempt.endedAt === null);

    return {
      streak_start: streakStart ? toUtcIso(streakStart) : null,
      attempt_number: active?.attemptNumber ?? attempts[0]?.attemptNumber ?? 1,
      max_duration_ms: maxDurationMs,
      member_since: toUtcIso(user.createdAt),
    };
  }

  searchNormalUsersByUsername(
    viewerUserId: number,
    usernamePrefix: string,
    limit = USERNAME_SEARCH_RESULT_LIMIT,
  ) {
    return this.prisma.user.findMany({
      where: {
        role: DEFAULT_USER_ROLE,
        user_id: { not: viewerUserId },
        username: {
          not: null,
          startsWith: usernamePrefix,
          mode: 'insensitive',
        },
        NOT: { username: { equals: '' } },
      },
      select: {
        user_id: true,
        username: true,
        image_url: true,
        countryFlag: true,
        country: true,
        status: true,
      },
      orderBy: { username: 'asc' },
      take: limit,
    });
  }

  /** Longest smoke-free stretch for an attempt (matches in-app streak timer). */
  private resolveAttemptDurationSeconds(
    attempt: {
      startedAt: Date;
      endedAt: Date | null;
      durationSeconds: number;
      closingSlipEvent: { previousStreakStart: Date | null } | null;
    },
    activeStartMs: number | null | undefined,
    nowMs: number,
  ): number {
    if (attempt.endedAt === null) {
      if (activeStartMs == null) return 0;
      return Math.max(0, Math.floor((nowMs - activeStartMs) / 1000));
    }

    const endedMs = attempt.endedAt.getTime();
    const fromStored = attempt.durationSeconds;
    const fromStartedAt = Math.max(
      0,
      Math.floor((endedMs - attempt.startedAt.getTime()) / 1000),
    );
    const slipStreakStart = attempt.closingSlipEvent?.previousStreakStart;
    const fromSlipStreak = slipStreakStart
      ? Math.max(0, Math.floor((endedMs - slipStreakStart.getTime()) / 1000))
      : 0;

    return Math.max(fromStored, fromStartedAt, fromSlipStreak);
  }
}
