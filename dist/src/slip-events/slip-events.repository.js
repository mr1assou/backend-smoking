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
const economics_segments_repository_1 = require("../attempts/economics-segments.repository");
const attempts_service_1 = require("../attempts/attempts.service");
const utc_instant_1 = require("../common/utc-instant");
const goals_repository_1 = require("../goals/goals.repository");
const prisma_service_1 = require("../prisma/prisma.service");
const lib_1 = require("./lib");
let SlipEventsRepository = class SlipEventsRepository {
    prisma;
    attemptsService;
    economicsSegmentsRepository;
    goalsRepository;
    constructor(prisma, attemptsService, economicsSegmentsRepository, goalsRepository) {
        this.prisma = prisma;
        this.attemptsService = attemptsService;
        this.economicsSegmentsRepository = economicsSegmentsRepository;
        this.goalsRepository = goalsRepository;
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
    async createWithAttemptRotation(data) {
        const now = (0, utc_instant_1.utcInstantNow)();
        const cigarettesCount = (0, lib_1.resolveSlipCigarettesCount)(data.outcome, data.cigarettesCount);
        const slipThisEvent = cigarettesCount ?? 0;
        const habitEconomics = (0, economics_segments_repository_1.habitEconomicsFromUser)({
            cigarettesPerDay: data.cigarettesPerDay,
            cigarettesPerPack: data.cigarettesPerPack,
            packPrice: data.packPrice,
        });
        let activeAttempt = await this.prisma.quitAttempt.findFirst({
            where: { user_id: data.userId, endedAt: null },
            orderBy: { attemptNumber: 'desc' },
        });
        if (!activeAttempt) {
            activeAttempt = await this.prisma.quitAttempt.create({
                data: {
                    user_id: data.userId,
                    attemptNumber: 1,
                    startedAt: data.previousQuitDate,
                },
            });
            await this.economicsSegmentsRepository.seedInitial(activeAttempt.attempt_id, data.previousQuitDate, habitEconomics);
        }
        const snapshot = await this.attemptsService.computeSegmentedSnapshot(data.userId, activeAttempt, data.previousStreakStart, now, { loggedAt: now, cigarettesCount: slipThisEvent });
        return this.prisma.$transaction(async (tx) => {
            const attempt = await tx.quitAttempt.findFirstOrThrow({
                where: { attempt_id: activeAttempt.attempt_id },
            });
            const closedAttempt = await tx.quitAttempt.update({
                where: { attempt_id: attempt.attempt_id },
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
                    attemptNumber: attempt.attemptNumber + 1,
                    startedAt: now,
                },
            });
            await this.economicsSegmentsRepository.seedInitial(newAttempt.attempt_id, now, habitEconomics, tx);
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
            await this.goalsRepository.failActiveGoalsForAttempt(tx, closedAttempt.attempt_id, event.slip_event_id);
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
                await this.goalsRepository.restoreGoalsFailedBySlip(tx, slipEventId);
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
        attempts_service_1.AttemptsService,
        economics_segments_repository_1.EconomicsSegmentsRepository,
        goals_repository_1.GoalsRepository])
], SlipEventsRepository);
//# sourceMappingURL=slip-events.repository.js.map