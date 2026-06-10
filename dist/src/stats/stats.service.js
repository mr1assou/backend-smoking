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
exports.StatsService = void 0;
const common_1 = require("@nestjs/common");
const attempts_repository_1 = require("../attempts/attempts.repository");
const attempts_service_1 = require("../attempts/attempts.service");
const utc_instant_1 = require("../common/utc-instant");
const slip_cigarette_count_1 = require("../slip-events/slip-cigarette-count");
const users_repository_1 = require("../users/users.repository");
const stats_repository_1 = require("./stats.repository");
let StatsService = class StatsService {
    usersRepository;
    attemptsRepository;
    attemptsService;
    statsRepository;
    constructor(usersRepository, attemptsRepository, attemptsService, statsRepository) {
        this.usersRepository = usersRepository;
        this.attemptsRepository = attemptsRepository;
        this.attemptsService = attemptsService;
        this.statsRepository = statsRepository;
    }
    async getUserStats(userId) {
        const user = await this.usersRepository.findById(userId);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const economics = this.attemptsService.buildEconomics(user);
        const now = (0, utc_instant_1.utcInstantNow)();
        const active = await this.attemptsRepository.findActive(userId);
        const completed = await this.attemptsRepository.listCompleted(userId);
        let current = null;
        let activeSnapshot = null;
        if (active) {
            const slipCigarettes = await this.usersRepository.sumSlipCigarettesSince(userId, active.startedAt);
            const slipCount = await this.statsRepository.countSlipsSince(userId, active.startedAt);
            activeSnapshot = this.attemptsService.computeSnapshot(economics, active.startedAt, now, slipCigarettes);
            current = {
                attemptNumber: active.attemptNumber,
                startedAt: (0, utc_instant_1.toUtcIso)(active.startedAt),
                streakStart: (0, utc_instant_1.toUtcIso)(user.streakStart ?? active.startedAt),
                slipCount,
                ...activeSnapshot,
            };
        }
        const completedTotals = completed.reduce((acc, row) => ({
            durationSeconds: acc.durationSeconds + row.durationSeconds,
            cigarettesAvoided: acc.cigarettesAvoided + row.cigarettesAvoided,
            moneySaved: acc.moneySaved + row.moneySaved,
            lifeMinutesGained: acc.lifeMinutesGained + row.lifeMinutesGained,
            slipCigarettesSmoked: acc.slipCigarettesSmoked + row.slipCigarettesSmoked,
        }), {
            durationSeconds: 0,
            cigarettesAvoided: 0,
            moneySaved: 0,
            lifeMinutesGained: 0,
            slipCigarettesSmoked: 0,
        });
        const lifetimeSlipCount = await this.statsRepository.countAllSlips(userId);
        const slipRows = await this.statsRepository.listSlipEvents(userId);
        const lifetime = {
            totalAttempts: completed.length + (active ? 1 : 0),
            completedAttempts: completed.length,
            slipCount: lifetimeSlipCount,
            durationSeconds: completedTotals.durationSeconds + (activeSnapshot?.durationSeconds ?? 0),
            cigarettesAvoided: completedTotals.cigarettesAvoided +
                (activeSnapshot?.cigarettesAvoided ?? 0),
            moneySaved: completedTotals.moneySaved + (activeSnapshot?.moneySaved ?? 0),
            lifeMinutesGained: completedTotals.lifeMinutesGained +
                (activeSnapshot?.lifeMinutesGained ?? 0),
            slipCigarettesSmoked: completedTotals.slipCigarettesSmoked +
                (activeSnapshot?.slipCigarettesSmoked ?? 0),
        };
        const attempts = await this.buildAttemptsList(userId, economics, active, activeSnapshot, now);
        return {
            currency: user.currency ?? 'USD',
            timezone: user.timezone?.trim() || 'UTC',
            economics: {
                cigarettesPerDay: economics.cigarettesPerDay,
                cigarettesPerPack: economics.cigarettesPerPack,
                packCost: economics.packPrice,
            },
            current,
            lifetime,
            attempts,
            slips: slipRows.map((row) => this.toSlipStatsRow(row)),
        };
    }
    toSlipStatsRow(row) {
        const cigarettesCount = (0, slip_cigarette_count_1.resolveSlipCigarettesCount)(row.outcome, row.cigarettesCount ?? undefined) ?? 0;
        return {
            slipEventId: row.slip_event_id,
            outcome: row.outcome,
            cigarettesCount,
            loggedAt: (0, utc_instant_1.toUtcIso)(row.loggedAt),
            attemptNumber: row.closedAttempt?.attemptNumber ?? null,
            attemptStartedAt: row.closedAttempt?.startedAt
                ? (0, utc_instant_1.toUtcIso)(row.closedAttempt.startedAt)
                : null,
        };
    }
    async buildAttemptsList(userId, economics, active, activeSnapshot, now) {
        const rows = await this.attemptsRepository.listAllForUser(userId);
        return Promise.all(rows.map(async (row) => {
            const isActive = row.endedAt === null;
            if (isActive && active && row.attempt_id === active.attempt_id && activeSnapshot) {
                return {
                    attemptNumber: row.attemptNumber,
                    startedAt: (0, utc_instant_1.toUtcIso)(row.startedAt),
                    endedAt: null,
                    endOutcome: null,
                    isActive: true,
                    ...activeSnapshot,
                };
            }
            if (isActive) {
                const slipCigarettes = await this.usersRepository.sumSlipCigarettesSince(userId, row.startedAt);
                const snapshot = this.attemptsService.computeSnapshot(economics, row.startedAt, now, slipCigarettes);
                return {
                    attemptNumber: row.attemptNumber,
                    startedAt: (0, utc_instant_1.toUtcIso)(row.startedAt),
                    endedAt: null,
                    endOutcome: null,
                    isActive: true,
                    ...snapshot,
                };
            }
            return {
                attemptNumber: row.attemptNumber,
                startedAt: (0, utc_instant_1.toUtcIso)(row.startedAt),
                endedAt: row.endedAt ? (0, utc_instant_1.toUtcIso)(row.endedAt) : null,
                endOutcome: row.endOutcome,
                isActive: false,
                durationSeconds: row.durationSeconds,
                cigarettesAvoided: row.cigarettesAvoided,
                moneySaved: row.moneySaved,
                lifeMinutesGained: row.lifeMinutesGained,
                slipCigarettesSmoked: row.slipCigarettesSmoked,
            };
        }));
    }
};
exports.StatsService = StatsService;
exports.StatsService = StatsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_repository_1.UsersRepository,
        attempts_repository_1.AttemptsRepository,
        attempts_service_1.AttemptsService,
        stats_repository_1.StatsRepository])
], StatsService);
//# sourceMappingURL=stats.service.js.map