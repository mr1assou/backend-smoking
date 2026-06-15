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
exports.SlipEventsRepository = void 0;
const common_1 = require("@nestjs/common");
const attempts_service_1 = require("../attempts/attempts.service");
const utc_instant_1 = require("../common/utc-instant");
const prisma_service_1 = require("../prisma/prisma.service");
const lib_1 = require("./lib");
let SlipEventsRepository = class SlipEventsRepository {
    prisma;
    attemptsService;
    constructor(prisma, attemptsService) {
        this.prisma = prisma;
        this.attemptsService = attemptsService;
    }
    findOwnedById(userId, slipEventId) {
        return this.prisma.slipEvent.findFirst({
            where: { slip_event_id: slipEventId, user_id: userId },
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
    createWithAttemptRotation(data) {
        const now = (0, utc_instant_1.utcInstantNow)();
        const cigarettesCount = (0, lib_1.resolveSlipCigarettesCount)(data.outcome, data.cigarettesCount);
        const economics = this.attemptsService.buildEconomics({
            cigarettesPerDay: data.cigarettesPerDay,
            cigarettesPerPack: data.cigarettesPerPack,
            packPrice: data.packPrice,
        });
        return this.prisma.$transaction(async (tx) => {
            let activeAttempt = await tx.quitAttempt.findFirst({
                where: { user_id: data.userId, endedAt: null },
                orderBy: { attemptNumber: 'desc' },
            });
            if (!activeAttempt) {
                activeAttempt = await tx.quitAttempt.create({
                    data: {
                        user_id: data.userId,
                        attemptNumber: 1,
                        startedAt: data.previousQuitDate,
                    },
                });
            }
            const priorSlipSum = await tx.slipEvent.aggregate({
                where: {
                    user_id: data.userId,
                    loggedAt: { gte: activeAttempt.startedAt },
                    cigarettesCount: { not: null },
                },
                _sum: { cigarettesCount: true },
            });
            const slipThisEvent = cigarettesCount ?? 0;
            const totalSlipCigarettes = (priorSlipSum._sum.cigarettesCount ?? 0) + slipThisEvent;
            const snapshot = this.attemptsService.computeSnapshot(economics, activeAttempt.startedAt, now, totalSlipCigarettes);
            const closedAttempt = await tx.quitAttempt.update({
                where: { attempt_id: activeAttempt.attempt_id },
                data: {
                    endedAt: now,
                    endOutcome: data.outcome,
                    durationSeconds: snapshot.durationSeconds,
                    cigarettesAvoided: snapshot.cigarettesAvoided,
                    moneySaved: snapshot.moneySaved,
                    lifeMinutesGained: snapshot.lifeMinutesGained,
                    slipCigarettesSmoked: snapshot.slipCigarettesSmoked,
                },
            });
            const newAttempt = await tx.quitAttempt.create({
                data: {
                    user_id: data.userId,
                    attemptNumber: activeAttempt.attemptNumber + 1,
                    startedAt: now,
                },
            });
            const event = await tx.slipEvent.create({
                data: {
                    user_id: data.userId,
                    outcome: data.outcome,
                    cigarettesCount: cigarettesCount ?? null,
                    previousStreakStart: data.previousStreakStart,
                    previousQuitDate: data.previousQuitDate,
                    closedAttemptId: closedAttempt.attempt_id,
                    newAttemptId: newAttempt.attempt_id,
                },
            });
            await tx.user.update({
                where: { user_id: data.userId },
                data: { streakStart: now, quitDate: now },
            });
            return {
                event,
                streakStart: now,
                quitDate: now,
                currentAttemptNumber: newAttempt.attemptNumber,
            };
        });
    }
    deleteOwnedAndRestoreAttempt(userId, slipEventId, event) {
        return this.prisma.$transaction(async (tx) => {
            let currentAttemptNumber = null;
            if (event.closedAttemptId && event.newAttemptId) {
                const reopened = await tx.quitAttempt.update({
                    where: { attempt_id: event.closedAttemptId },
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
                await tx.quitAttempt.delete({
                    where: { attempt_id: event.newAttemptId },
                });
                currentAttemptNumber = reopened.attemptNumber;
                await tx.user.update({
                    where: { user_id: userId },
                    data: {
                        streakStart: event.previousStreakStart,
                        quitDate: event.previousQuitDate,
                    },
                });
            }
            else if (event.previousStreakStart) {
                await tx.user.update({
                    where: { user_id: userId },
                    data: { streakStart: event.previousStreakStart },
                });
            }
            await tx.slipEvent.delete({ where: { slip_event_id: slipEventId } });
            return {
                streakStart: event.previousStreakStart,
                quitDate: event.previousQuitDate,
                currentAttemptNumber,
            };
        });
    }
};
exports.SlipEventsRepository = SlipEventsRepository;
exports.SlipEventsRepository = SlipEventsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        attempts_service_1.AttemptsService])
], SlipEventsRepository);
//# sourceMappingURL=slip-events.repository.js.map