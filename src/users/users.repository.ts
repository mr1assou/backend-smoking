import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UserDevicePreferencesUpdate } from './types/user-device-preferences';
import type { UserMeProfile, UserOnboardingData } from './types/user-onboarding-data';

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
        email: true,
        username: true,
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
        timezone: true,
      },
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
}
