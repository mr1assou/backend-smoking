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
exports.AttemptsRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AttemptsRepository = class AttemptsRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findActive(userId) {
        return this.prisma.quitAttempt.findFirst({
            where: { user_id: userId, endedAt: null },
            orderBy: { attemptNumber: 'desc' },
        });
    }
    findById(userId, attemptId) {
        return this.prisma.quitAttempt.findFirst({
            where: { attempt_id: attemptId, user_id: userId },
        });
    }
    listCompleted(userId) {
        return this.prisma.quitAttempt.findMany({
            where: { user_id: userId, endedAt: { not: null } },
            orderBy: { attemptNumber: 'desc' },
        });
    }
    listAllForUser(userId) {
        return this.prisma.quitAttempt.findMany({
            where: { user_id: userId },
            orderBy: { attemptNumber: 'desc' },
        });
    }
    countForUser(userId) {
        return this.prisma.quitAttempt.count({ where: { user_id: userId } });
    }
    createFirst(userId, startedAt) {
        return this.prisma.quitAttempt.create({
            data: {
                user_id: userId,
                attemptNumber: 1,
                startedAt,
            },
        });
    }
    createNext(userId, attemptNumber, startedAt) {
        return this.prisma.quitAttempt.create({
            data: {
                user_id: userId,
                attemptNumber,
                startedAt,
            },
        });
    }
    close(attemptId, data) {
        return this.prisma.quitAttempt.update({
            where: { attempt_id: attemptId },
            data: {
                endedAt: data.endedAt,
                endOutcome: data.endOutcome,
                durationSeconds: data.durationSeconds,
                cigarettesAvoided: data.cigarettesAvoided,
                moneySaved: data.moneySaved,
                lifeMinutesGained: data.lifeMinutesGained,
                slipCigarettesSmoked: data.slipCigarettesSmoked,
            },
        });
    }
    deleteById(attemptId) {
        return this.prisma.quitAttempt
            .delete({ where: { attempt_id: attemptId } })
            .then(() => undefined);
    }
    reopen(attemptId) {
        return this.prisma.quitAttempt.update({
            where: { attempt_id: attemptId },
            data: {
                endedAt: null,
                endOutcome: null,
                durationSeconds: 0,
                cigarettesAvoided: 0,
                moneySaved: 0,
                lifeMinutesGained: 0,
                slipCigarettesSmoked: 0,
            },
        });
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
};
exports.AttemptsRepository = AttemptsRepository;
exports.AttemptsRepository = AttemptsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttemptsRepository);
//# sourceMappingURL=attempts.repository.js.map