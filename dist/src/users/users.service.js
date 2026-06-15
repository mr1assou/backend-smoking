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
const badges_service_1 = require("../badges/badges.service");
const utc_instant_1 = require("../common/utc-instant");
const storage_service_1 = require("../storage/storage.service");
const users_repository_1 = require("./users.repository");
let UsersService = class UsersService {
    usersRepository;
    attemptsService;
    storageService;
    badgesService;
    constructor(usersRepository, attemptsService, storageService, badgesService) {
        this.usersRepository = usersRepository;
        this.attemptsService = attemptsService;
        this.storageService = storageService;
        this.badgesService = badgesService;
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
            await this.attemptsService.ensureFirstAttempt(userId, data.quitDate);
        }
        return result;
    }
    async updatePreferences(userId, dto) {
        const data = {};
        if (dto.timezone !== undefined) {
            data.timezone = dto.timezone.trim() || null;
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
        const user = await this.usersRepository.findMeProfile(userId);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const activeAttempt = await this.attemptsService.getActiveAttempt(userId);
        const slipCigarettesTotal = activeAttempt
            ? await this.usersRepository.sumSlipCigarettesSince(userId, activeAttempt.startedAt)
            : 0;
        const earnedBadgeIds = await this.badgesService.findEarnedBadgeIds(userId);
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
            timezone: user.timezone ?? undefined,
            imageUrl: user.image_url ?? undefined,
            slipCigarettesTotal,
            currentAttemptNumber: activeAttempt?.attemptNumber ?? 1,
            freedomPoints: user.freedomPoints,
            earnedBadgeIds,
        };
    }
    mapOnboardingDtoToData(dto) {
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
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_repository_1.UsersRepository,
        attempts_service_1.AttemptsService,
        storage_service_1.StorageService,
        badges_service_1.BadgesService])
], UsersService);
//# sourceMappingURL=users.service.js.map