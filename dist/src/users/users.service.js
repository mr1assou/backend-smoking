"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const attempts_service_1 = require("../attempts/attempts.service");
const economics_segments_repository_1 = require("../attempts/economics-segments.repository");
const attempts_repository_1 = require("../attempts/attempts.repository");
const badges_service_1 = require("../badges/badges.service");
const freedom_points_service_1 = require("../freedom-points/freedom-points.service");
const utc_instant_1 = require("../common/utc-instant");
const storage_service_1 = require("../storage/storage.service");
const normalize_username_1 = require("./lib/normalize-username");
const default_profile_image_1 = require("./lib/default-profile-image");
const users_repository_1 = require("./users.repository");
const user_roles_1 = require("./lib/user-roles");
let UsersService = class UsersService {
    usersRepository;
    attemptsRepository;
    attemptsService;
    economicsSegmentsRepository;
    storageService;
    badgesService;
    freedomPointsService;
    constructor(usersRepository, attemptsRepository, attemptsService, economicsSegmentsRepository, storageService, badgesService, freedomPointsService) {
        this.usersRepository = usersRepository;
        this.attemptsRepository = attemptsRepository;
        this.attemptsService = attemptsService;
        this.economicsSegmentsRepository = economicsSegmentsRepository;
        this.storageService = storageService;
        this.badgesService = badgesService;
        this.freedomPointsService = freedomPointsService;
    }
    async createWithHashedPassword(email, hashedPassword) {
        return this.usersRepository.createWithCredentials(email, hashedPassword);
    }
    async findByEmail(email) {
        return this.usersRepository.findByEmail(email);
    }
    async findById(userId) {
        return this.usersRepository.findById(userId);
    }
    async findOrCreateByEmail(email, hashedPassword) {
        const existing = await this.usersRepository.findByEmail(email);
        if (existing) {
            return { user: existing, isNewUser: false };
        }
        const user = await this.usersRepository.createWithCredentials(email, hashedPassword);
        return { user, isNewUser: true };
    }
    async updateOnboarding(userId, dto) {
        const data = this.mapOnboardingDtoToData(dto);
        const result = await this.usersRepository.updateOnboarding(userId, data);
        if (data.quitDate) {
            await this.attemptsService.ensureFirstAttempt(userId, data.quitDate, {
                cigarettesPerDay: data.cigarettesPerDay ?? 0,
                cigarettesPerPack: data.cigarettesPerPack ?? 20,
                packPrice: data.packPrice,
            });
            await this.freedomPointsService.syncSmokeFreeDayRewards(userId);
            await this.badgesService.syncEarnedBadges(userId);
        }
        return result;
    }
    async resetJourney(userId, dto = {}) {
        const user = await this.usersRepository.findById(userId);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (!user.username?.trim()) {
            throw new common_1.NotFoundException('Complete onboarding before resetting your journey');
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
            await this.attemptsService.seedEconomicsForAttempt(active.attempt_id, startedAt, (0, economics_segments_repository_1.habitEconomicsFromUser)(userAfterReset));
        }
        return this.getMe(userId);
    }
    async updateHabitSettings(userId, dto) {
        const user = await this.usersRepository.findById(userId);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const packPrice = dto.packPrice?.trim() ||
            (dto.packCost !== undefined ? String(dto.packCost) : user.packPrice);
        const economics = {
            cigarettesPerDay: dto.cigarettesPerDay,
            cigarettesPerPack: dto.cigarettesPerPack,
            packPrice: packPrice ?? null,
        };
        await this.usersRepository.updateHabitSettings(userId, economics);
        const active = await this.attemptsRepository.findActive(userId);
        if (active) {
            await this.economicsSegmentsRepository.appendIfChanged(active.attempt_id, (0, utc_instant_1.utcInstantNow)(), economics);
        }
        return this.getMe(userId);
    }
    async updatePreferences(userId, dto) {
        const data = {};
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
    async updateProfileImage(userId, dto) {
        this.storageService.assertOwnedProfileImageUrl(userId, dto.image_url);
        await this.usersRepository.updateProfileImage(userId, dto.image_url);
        return { image_url: dto.image_url };
    }
    async setRefreshTokenHash(userId, hashedRefreshToken) {
        await this.usersRepository.updateRefreshToken(userId, hashedRefreshToken);
    }
    async getMe(userId) {
        const fpSync = await this.freedomPointsService.syncSmokeFreeDayRewards(userId);
        const badgeSync = await this.badgesService.syncEarnedBadges(userId);
        const user = await this.usersRepository.findMeProfile(userId);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const activeAttempt = await this.attemptsService.getActiveAttempt(userId);
        const slipCigarettesTotal = activeAttempt
            ? await this.usersRepository.sumSlipCigarettesSince(userId, activeAttempt.startedAt)
            : 0;
        const earnedBadgeIds = badgeSync.earnedBadgeIds;
        const economicsSegments = activeAttempt
            ? (await this.economicsSegmentsRepository.listForAttempt(activeAttempt.attempt_id)).map((segment) => ({
                effectiveFrom: (0, utc_instant_1.toUtcIso)(segment.effective_from),
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
            quitDate: user.quitDate ? (0, utc_instant_1.toUtcIso)(user.quitDate) : undefined,
            streakStart: user.streakStart ? (0, utc_instant_1.toUtcIso)(user.streakStart) : undefined,
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
            role: user.role ?? user_roles_1.DEFAULT_USER_ROLE,
        };
    }
    mapOnboardingDtoToData(dto) {
        const quitDate = this.resolveQuitDate(dto.step5);
        return {
            quitReasons: dto.step1.quitReasons,
            motivation: dto.step2.motivation ?? null,
            priorQuitAttempts: dto.step3.priorQuitAttempts ?? null,
            primaryInterests: dto.step4.primaryInterests,
            username: (0, normalize_username_1.normalizeStoredUsername)(dto.step5.username) || null,
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
            image_url: (0, default_profile_image_1.defaultProfileImageForSex)(dto.step5.sex),
        };
    }
    resolveQuitDateInstant(input) {
        if (input.quitDatePreset === 'Now') {
            return (0, utc_instant_1.utcInstantNow)();
        }
        if (input.quitDate?.trim()) {
            const parsed = new Date(input.quitDate);
            return Number.isNaN(parsed.getTime()) ? (0, utc_instant_1.utcInstantNow)() : parsed;
        }
        return (0, utc_instant_1.utcInstantNow)();
    }
    resolveQuitDate(step5) {
        if (step5.quitDatePreset === 'Now') {
            return (0, utc_instant_1.utcInstantNow)();
        }
        if (step5.quitDate?.trim()) {
            const parsed = new Date(step5.quitDate);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
        return null;
    }
    async registerPushToken(userId, dto) {
        await this.usersRepository.registerPushToken(userId, dto.token.trim(), dto.platform);
        return { ok: true };
    }
    async getPushTokenStatus(userId) {
        const has_token = await this.usersRepository.hasPushToken(userId);
        return { has_token };
    }
    async clearPushTokens(userId) {
        await this.usersRepository.clearPushTokensForUser(userId);
        return { ok: true };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_repository_1.UsersRepository,
        attempts_repository_1.AttemptsRepository,
        attempts_service_1.AttemptsService,
        economics_segments_repository_1.EconomicsSegmentsRepository,
        storage_service_1.StorageService,
        badges_service_1.BadgesService,
        freedom_points_service_1.FreedomPointsService])
], UsersService);
//# sourceMappingURL=users.service.js.map