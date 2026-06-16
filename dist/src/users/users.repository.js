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
                timezone: true,
                image_url: true,
                freedomPoints: true,
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
    updateLastOfflineAt(userId, at) {
        return this.prisma.user.update({
            where: { user_id: userId },
            data: { last_offline_at: at },
        });
    }
};
exports.UsersRepository = UsersRepository;
exports.UsersRepository = UsersRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersRepository);
//# sourceMappingURL=users.repository.js.map