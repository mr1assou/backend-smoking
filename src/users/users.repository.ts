import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UserDevicePreferencesUpdate } from './types/user-device-preferences';
import type {
  UserMeProfile,
  UserOnboardingData,
} from './types/user-onboarding-data';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  createWithCredentials(email: string, password: string): Promise<User> {
    return this.prisma.user.create({
      data: { email, password },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findById(userId: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
    });
  }

  findMeProfile(userId: number): Promise<UserMeProfile | null> {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        email: true,
        username: true,
        isPremium: true,
        sex: true,
        country: true,
        countryFlag: true,
        currency: true,
        quitDatePreset: true,
        quitDate: true,
        streakStart: true,
        cigarettesPerDay: true,
        cigarettesPerPack: true,
        packPrice: true,
        image_url: true,
        freedomPoints: true,
        motivationCardIndex: true,
        tipsCardIndex: true,
        savedTipCardIds: true,
        savedMotivationCardIds: true,
        role: true,
      },
    });
  }

  updatePremium(userId: number, isPremium: boolean): Promise<User> {
    return this.prisma.user.update({
      where: { user_id: userId },
      data: { isPremium },
    });
  }

  sumSlipCigarettesSince(userId: number, since: Date): Promise<number> {
    return this.prisma.slipEvent
      .aggregate({
        where: {
          user_id: userId,
          loggedAt: { gte: since },
          cigarettesCount: { not: null },
        },
        _sum: { cigarettesCount: true },
      })
      .then((result) => result._sum.cigarettesCount ?? 0);
  }

  sumSlipCigarettesBetween(
    userId: number,
    from: Date,
    to: Date,
  ): Promise<number> {
    return this.prisma.slipEvent
      .aggregate({
        where: {
          user_id: userId,
          loggedAt: { gte: from, lt: to },
          cigarettesCount: { not: null },
        },
        _sum: { cigarettesCount: true },
      })
      .then((result) => result._sum.cigarettesCount ?? 0);
  }

  listSlipEventsBetween(
    userId: number,
    from: Date,
    to: Date,
  ): Promise<{ loggedAt: Date; cigarettesCount: number | null }[]> {
    return this.prisma.slipEvent.findMany({
      where: {
        user_id: userId,
        loggedAt: { gte: from, lt: to },
      },
      select: {
        loggedAt: true,
        cigarettesCount: true,
      },
      orderBy: { loggedAt: 'asc' },
    });
  }

  updateDevicePreferences(
    userId: number,
    data: UserDevicePreferencesUpdate,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { user_id: userId },
      data,
    });
  }

  updateOnboarding(
    userId: number,
    data: UserOnboardingData,
  ): Promise<{ user_id: number; email: string }> {
    return this.prisma.user.update({
      where: { user_id: userId },
      data,
      select: { user_id: true, email: true },
    });
  }

  updateRefreshToken(
    userId: number,
    hashedRefreshToken: string | null,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { user_id: userId },
      data: { hashedRefreshToken },
    });
  }

  updateProfileImage(userId: number, imageUrl: string): Promise<User> {
    return this.prisma.user.update({
      where: { user_id: userId },
      data: { image_url: imageUrl },
    });
  }

  updateUsername(userId: number, username: string): Promise<User> {
    return this.prisma.user.update({
      where: { user_id: userId },
      data: { username },
    });
  }

  updateHabitSettings(
    userId: number,
    economics: {
      cigarettesPerDay: number;
      cigarettesPerPack: number;
      packPrice: string | null;
    },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { user_id: userId },
      data: {
        cigarettesPerDay: economics.cigarettesPerDay,
        cigarettesPerPack: economics.cigarettesPerPack,
        packPrice: economics.packPrice,
      },
    });
  }

  updateLastOfflineAt(userId: number, at: Date): Promise<User> {
    return this.prisma.user.update({
      where: { user_id: userId },
      data: { last_offline_at: at },
    });
  }

  /** Wipes quit progress and restarts the user at day zero (keeps account + profile). */
  async resetJourneyProgress(
    userId: number,
    startedAt: Date,
    quitDatePreset: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userGoal.deleteMany({ where: { user_id: userId } });
      await tx.slipEvent.deleteMany({ where: { user_id: userId } });
      await tx.quitAttempt.deleteMany({ where: { user_id: userId } });
      await tx.planDayProgress.deleteMany({ where: { user_id: userId } });
      await tx.userBadge.deleteMany({ where: { user_id: userId } });
      await tx.freedomPointLedger.deleteMany({ where: { user_id: userId } });

      await tx.user.update({
        where: { user_id: userId },
        data: {
          quitDate: startedAt,
          streakStart: startedAt,
          quitDatePreset,
          freedomPoints: 0,
          motivationCardIndex: 0,
          tipsCardIndex: 0,
          savedTipCardIds: [],
          savedMotivationCardIds: [],
        },
      });

      await tx.quitAttempt.create({
        data: {
          user_id: userId,
          attemptNumber: 1,
          startedAt,
        },
      });
    });
  }

  async registerPushToken(
    userId: number,
    token: string,
    platform: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.pushToken.deleteMany({
        where: { user_id: userId, token: { not: token } },
      });

      await tx.pushToken.upsert({
        where: { token },
        create: { user_id: userId, token, platform },
        update: { user_id: userId, platform },
      });
    });
  }

  hasPushToken(userId: number): Promise<boolean> {
    return this.prisma.pushToken
      .count({ where: { user_id: userId } })
      .then((count) => count > 0);
  }

  clearPushTokensForUser(userId: number): Promise<void> {
    return this.prisma.pushToken
      .deleteMany({ where: { user_id: userId } })
      .then(() => undefined);
  }
}
