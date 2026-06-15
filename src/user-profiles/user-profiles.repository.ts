import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toUtcIso } from '../common/utc-instant';

export type UserStreakStats = {
  streak_start: string | null;
  attempt_number: number;
  max_duration_ms: number;
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
      },
    });

    const now = Date.now();
    let maxDurationMs = 0;

    for (const attempt of attempts) {
      const durationSeconds =
        attempt.endedAt === null
          ? Math.max(0, Math.floor((now - attempt.startedAt.getTime()) / 1000))
          : attempt.durationSeconds;
      maxDurationMs = Math.max(maxDurationMs, durationSeconds * 1000);
    }

    const active = attempts.find((attempt) => attempt.endedAt === null);
    const streakStart = user.streakStart ?? user.quitDate;

    return {
      streak_start: streakStart ? toUtcIso(streakStart) : null,
      attempt_number: active?.attemptNumber ?? attempts[0]?.attemptNumber ?? 1,
      max_duration_ms: maxDurationMs,
    };
  }
}
