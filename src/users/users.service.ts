import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { AttemptsService } from '../attempts/attempts.service';
import {
  EconomicsSegmentsRepository,
  habitEconomicsFromUser,
} from '../attempts/economics-segments.repository';
import { AttemptsRepository } from '../attempts/attempts.repository';
import { BadgesService } from '../badges/badges.service';
import { FreedomPointsService } from '../freedom-points/freedom-points.service';
import { toUtcIso, utcInstantNow } from '../common/utc-instant';
import { StorageService } from '../storage/storage.service';
import { UpdateHabitSettingsDto } from './dto/update-habit-settings.dto';
import { ResetJourneyDto } from './dto/reset-journey.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { UpdateProfileImageDto } from './dto/update-profile-image.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { defaultProfileFileName } from './lib/default-profile-image';
import { UsersRepository } from './users.repository';
import type { UserDevicePreferencesUpdate } from './types/user-device-preferences';
import type { UserOnboardingData } from './types/user-onboarding-data';
import { DEFAULT_USER_ROLE } from './lib/user-roles';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly attemptsRepository: AttemptsRepository,
    private readonly attemptsService: AttemptsService,
    private readonly economicsSegmentsRepository: EconomicsSegmentsRepository,
    private readonly storageService: StorageService,
    private readonly badgesService: BadgesService,
    private readonly freedomPointsService: FreedomPointsService,
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
    const existing = await this.usersRepository.findById(userId);

    if (!existing?.image_url) {
      const fileName = defaultProfileFileName(data.sex);
      data.image_url = await this.storageService.seedDefaultProfileImage(
        userId,
        fileName,
      );
    }

    const result = await this.usersRepository.updateOnboarding(userId, data);

    if (data.quitDate) {
      await this.attemptsService.ensureFirstAttempt(
        userId,
        data.quitDate,
        {
          cigarettesPerDay: data.cigarettesPerDay ?? 0,
          cigarettesPerPack: data.cigarettesPerPack ?? 20,
          packPrice: data.packPrice,
        },
      );
      await this.freedomPointsService.syncSmokeFreeDayRewards(userId);
      await this.badgesService.syncEarnedBadges(userId);
    }

    return result;
  }

  async resetJourney(userId: number, dto: ResetJourneyDto = {}) {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (!user.username?.trim()) {
      throw new NotFoundException(
        'Complete onboarding before resetting your journey',
      );
    }

    const preset = dto.quitDatePreset === 'Custom' ? 'Custom' : 'Now';
    const startedAt = this.resolveQuitDateInstant({
      quitDatePreset: preset,
      quitDate: dto.quitDate,
    });

    await this.usersRepository.resetJourneyProgress(userId, startedAt, preset);

    const userAfterReset = await this.usersRepository.findById(userId);
    const active = await this.attemptsRepository.findActive(userId);
    if (active && userAfterReset) {
      await this.attemptsService.seedEconomicsForAttempt(
        active.attempt_id,
        startedAt,
        habitEconomicsFromUser(userAfterReset),
      );
    }

    return this.getMe(userId);
  }

  async updateHabitSettings(userId: number, dto: UpdateHabitSettingsDto) {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const packPrice =
      dto.packPrice?.trim() ||
      (dto.packCost !== undefined ? String(dto.packCost) : user.packPrice);

    const economics = {
      cigarettesPerDay: dto.cigarettesPerDay,
      cigarettesPerPack: dto.cigarettesPerPack,
      packPrice: packPrice ?? null,
    };

    await this.usersRepository.updateHabitSettings(userId, economics);

    const active = await this.attemptsRepository.findActive(userId);
    if (active) {
      await this.economicsSegmentsRepository.appendIfChanged(
        active.attempt_id,
        utcInstantNow(),
        economics,
      );
    }

    return this.getMe(userId);
  }

  async updatePreferences(userId: number, dto: UpdateUserPreferencesDto) {
    const data: UserDevicePreferencesUpdate = {};
    if (dto.motivationCardIndex !== undefined) {
      data.motivationCardIndex = dto.motivationCardIndex;
    }
    if (dto.tipsCardIndex !== undefined) {
      data.tipsCardIndex = dto.tipsCardIndex;
    }
    if (dto.savedTipCardIds !== undefined) {
      data.savedTipCardIds = dto.savedTipCardIds;
    }
    if (dto.savedMotivationCardIds !== undefined) {
      data.savedMotivationCardIds = dto.savedMotivationCardIds;
    }
    return this.usersRepository.updateDevicePreferences(userId, data);
  }

  async updateProfileImage(userId: number, dto: UpdateProfileImageDto) {
    this.storageService.assertOwnedProfileImageUrl(userId, dto.image_url);
    await this.usersRepository.updateProfileImage(userId, dto.image_url);
    return { image_url: dto.image_url };
  }

  async setRefreshTokenHash(
    userId: number,
    hashedRefreshToken: string | null,
  ): Promise<void> {
    await this.usersRepository.updateRefreshToken(userId, hashedRefreshToken);
  }

  async getMe(userId: number) {
    const fpSync =
      await this.freedomPointsService.syncSmokeFreeDayRewards(userId);
    const badgeSync = await this.badgesService.syncEarnedBadges(userId);

    const user = await this.usersRepository.findMeProfile(userId);

    if (!user) throw new NotFoundException('User not found');

    const activeAttempt = await this.attemptsService.getActiveAttempt(userId);
    const slipCigarettesTotal = activeAttempt
      ? await this.usersRepository.sumSlipCigarettesSince(
          userId,
          activeAttempt.startedAt,
        )
      : 0;
    const earnedBadgeIds = badgeSync.earnedBadgeIds;

    const economicsSegments = activeAttempt
      ? (
          await this.economicsSegmentsRepository.listForAttempt(
            activeAttempt.attempt_id,
          )
        ).map((segment) => ({
          effectiveFrom: toUtcIso(segment.effective_from),
          cigarettesPerDay: segment.cigarettes_per_day,
          cigarettesPerPack: segment.cigarettes_per_pack,
          packPrice: segment.pack_price ?? undefined,
        }))
      : undefined;

    return {
      userId: user.user_id,
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
      motivationCardIndex: user.motivationCardIndex,
      tipsCardIndex: user.tipsCardIndex,
      savedTipCardIds: user.savedTipCardIds,
      savedMotivationCardIds: user.savedMotivationCardIds,
      imageUrl: user.image_url ?? undefined,
      slipCigarettesTotal,
      currentAttemptNumber: activeAttempt?.attemptNumber ?? 1,
      freedomPoints: fpSync.totalFreedomPoints,
      goalsCompleted: await this.badgesService.countCompletedGoals(userId),
      earnedBadgeIds,
      economicsSegments,
      role: user.role ?? DEFAULT_USER_ROLE,
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

  /** `Now` → server UTC instant; custom → client ISO instant (device-local day). */
  private resolveQuitDateInstant(input: {
    quitDatePreset: string;
    quitDate?: string;
  }): Date {
    if (input.quitDatePreset === 'Now') {
      return utcInstantNow();
    }
    if (input.quitDate?.trim()) {
      const parsed = new Date(input.quitDate);
      return Number.isNaN(parsed.getTime()) ? utcInstantNow() : parsed;
    }
    return utcInstantNow();
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
