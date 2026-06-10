import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { AttemptsService } from '../attempts/attempts.service';
import { toUtcIso, utcInstantNow } from '../common/utc-instant';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { UsersRepository } from './users.repository';
import type { UserDevicePreferencesUpdate } from './types/user-device-preferences';
import type { UserOnboardingData } from './types/user-onboarding-data';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly attemptsService: AttemptsService,
  ) {}

  async createWithHashedPassword(
    email: string,
    hashedPassword: string,
  ): Promise<User> {
    return this.usersRepository.createWithCredentials(email, hashedPassword);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findById(userId: number): Promise<User | null> {
    return this.usersRepository.findById(userId);
  }

  async findOrCreateByEmail(
    email: string,
    hashedPassword: string,
  ): Promise<{ user: User; isNewUser: boolean }> {
    const existing = await this.usersRepository.findByEmail(email);

    if (existing) {
      return { user: existing, isNewUser: false };
    }

    const user = await this.usersRepository.createWithCredentials(
      email,
      hashedPassword,
    );
    return { user, isNewUser: true };
  }

  async updateOnboarding(userId: number, dto: UpdateOnboardingDto) {
    const data = this.mapOnboardingDtoToData(dto);
    const result = await this.usersRepository.updateOnboarding(userId, data);

    if (data.quitDate) {
      await this.attemptsService.ensureFirstAttempt(userId, data.quitDate);
    }

    return result;
  }

  async updatePreferences(userId: number, dto: UpdateUserPreferencesDto) {
    const data: UserDevicePreferencesUpdate = {};
    if (dto.timezone !== undefined) {
      data.timezone = dto.timezone.trim() || null;
    }
    return this.usersRepository.updateDevicePreferences(userId, data);
  }

  async setRefreshTokenHash(
    userId: number,
    hashedRefreshToken: string | null,
  ): Promise<void> {
    await this.usersRepository.updateRefreshToken(userId, hashedRefreshToken);
  }

  async getMe(userId: number) {
    const user = await this.usersRepository.findMeProfile(userId);

    if (!user) throw new NotFoundException('User not found');

    const activeAttempt = await this.attemptsService.getActiveAttempt(userId);
    const slipCigarettesTotal = activeAttempt
      ? await this.usersRepository.sumSlipCigarettesSince(userId, activeAttempt.startedAt)
      : 0;

    return {
      email: user.email,
      name: user.username ?? undefined,
      hasCompletedOnboarding: Boolean(user.username?.trim()),
      sex: user.sex ?? undefined,
      country: user.country ?? undefined,
      countryFlag: user.countryFlag ?? undefined,
      currency: user.currency ?? undefined,
      quitDatePreset: user.quitDatePreset ?? undefined,
      quitDate: user.quitDate ? toUtcIso(user.quitDate) : undefined,
      streakStart: user.streakStart ? toUtcIso(user.streakStart) : undefined,
      cigarettesPerDay: user.cigarettesPerDay ?? undefined,
      cigarettesPerPack: user.cigarettesPerPack ?? undefined,
      packPrice: user.packPrice ?? undefined,
      timezone: user.timezone ?? undefined,
      slipCigarettesTotal,
      currentAttemptNumber: activeAttempt?.attemptNumber ?? 1,
    };
  }

  private mapOnboardingDtoToData(dto: UpdateOnboardingDto): UserOnboardingData {
    const quitDate = this.resolveQuitDate(dto.step5);

    return {
      quitReasons: dto.step1.quitReasons,
      motivation: dto.step2.motivation ?? null,
      priorQuitAttempts: dto.step3.priorQuitAttempts ?? null,
      primaryInterests: dto.step4.primaryInterests,
      username: dto.step5.username.trim() || null,
      sex: dto.step5.sex ?? null,
      country: dto.step5.country ?? null,
      countryFlag: dto.step5.countryFlag?.trim() || null,
      currency: dto.step5.currency ?? null,
      quitDatePreset: dto.step5.quitDatePreset ?? null,
      quitDate,
      streakStart: quitDate,
      cigarettesPerDay: dto.step6.cigarettesPerDay ?? null,
      cigarettesPerDayNote: dto.step6.cigarettesPerDayNote ?? null,
      packPrice: dto.step6.packPrice ?? null,
      yearsSmoking: dto.step6.yearsSmoking ?? null,
      cigarettesPerPack: dto.step6.cigarettesPerPack ?? null,
    };
  }

  /** `Now` → server UTC instant; custom → client ISO instant. */
  private resolveQuitDate(step5: UpdateOnboardingDto['step5']): Date | null {
    if (step5.quitDatePreset === 'Now') {
      return utcInstantNow();
    }
    if (step5.quitDate?.trim()) {
      const parsed = new Date(step5.quitDate);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }
}
