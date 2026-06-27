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
exports.UsersRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersRepository = class UsersRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    createWithCredentials(email, password) {
        return this.prisma.user.create({
            data: { email, password },
        });
    }
    findByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }
    findById(userId) {
        return this.prisma.user.findUnique({
            where: { user_id: userId },
        });
    }
    findMeProfile(userId) {
        return this.prisma.user.findUnique({
            where: { user_id: userId },
            select: {
                user_id: true,
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
    sumSlipCigarettesSince(userId, since) {
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
    sumSlipCigarettesBetween(userId, from, to) {
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
    listSlipEventsBetween(userId, from, to) {
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
    updateDevicePreferences(userId, data) {
        return this.prisma.user.update({
            where: { user_id: userId },
            data,
        });
    }
    updateOnboarding(userId, data) {
        return this.prisma.user.update({
            where: { user_id: userId },
            data,
            select: { user_id: true, email: true },
        });
    }
    updateRefreshToken(userId, hashedRefreshToken) {
        return this.prisma.user.update({
            where: { user_id: userId },
            data: { hashedRefreshToken },
        });
    }
    updateProfileImage(userId, imageUrl) {
        return this.prisma.user.update({
            where: { user_id: userId },
            data: { image_url: imageUrl },
        });
    }
    updateHabitSettings(userId, economics) {
        return this.prisma.user.update({
            where: { user_id: userId },
            data: {
                cigarettesPerDay: economics.cigarettesPerDay,
                cigarettesPerPack: economics.cigarettesPerPack,
                packPrice: economics.packPrice,
            },
        });
    }
    updateLastOfflineAt(userId, at) {
        return this.prisma.user.update({
            where: { user_id: userId },
            data: { last_offline_at: at },
        });
    }
    async resetJourneyProgress(userId, startedAt, quitDatePreset) {
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
    async registerPushToken(userId, token, platform) {
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
    hasPushToken(userId) {
        return this.prisma.pushToken
            .count({ where: { user_id: userId } })
            .then((count) => count > 0);
    }
    clearPushTokensForUser(userId) {
        return this.prisma.pushToken
            .deleteMany({ where: { user_id: userId } })
            .then(() => undefined);
    }
};
exports.UsersRepository = UsersRepository;
exports.UsersRepository = UsersRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersRepository);
//# sourceMappingURL=users.repository.js.map