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
exports.AttemptsService = void 0;
const common_1 = require("@nestjs/common");
const segmented_attempt_impact_1 = require("../stats/lib/segmented-attempt-impact");
const economics_segments_repository_1 = require("./economics-segments.repository");
const attempts_repository_1 = require("./attempts.repository");
const attempt_impact_1 = require("../stats/lib/attempt-impact");
let AttemptsService = class AttemptsService {
    attemptsRepository;
    economicsSegmentsRepository;
    constructor(attemptsRepository, economicsSegmentsRepository) {
        this.attemptsRepository = attemptsRepository;
        this.economicsSegmentsRepository = economicsSegmentsRepository;
    }
    async ensureFirstAttempt(userId, startedAt, economics) {
        const active = await this.attemptsRepository.findActive(userId);
        if (active)
            return active;
        const count = await this.attemptsRepository.countForUser(userId);
        const attempt = count > 0
            ? await this.attemptsRepository.createNext(userId, count + 1, startedAt)
            : await this.attemptsRepository.createFirst(userId, startedAt);
        if (economics) {
            await this.economicsSegmentsRepository.seedInitial(attempt.attempt_id, startedAt, economics);
        }
        return attempt;
    }
    async seedEconomicsForAttempt(attemptId, effectiveFrom, economics) {
        const existing = await this.economicsSegmentsRepository.listForAttempt(attemptId);
        if (existing.length > 0)
            return;
        await this.economicsSegmentsRepository.seedInitial(attemptId, effectiveFrom, economics);
    }
    buildEconomics(user) {
        return {
            cigarettesPerDay: user.cigarettesPerDay ?? 0,
            cigarettesPerPack: user.cigarettesPerPack ?? 20,
            packPrice: (0, attempt_impact_1.parsePackPrice)(user.packPrice),
        };
    }
    computeSnapshot(economics, startedAt, endedAt, slipCigarettesSmoked) {
        return (0, attempt_impact_1.computeAttemptImpact)(economics, startedAt, endedAt, slipCigarettesSmoked);
    }
    async computeSegmentedSnapshot(userId, attempt, timelineStart, endedAt, pendingSlip) {
        const segments = await this.economicsSegmentsRepository.listForAttempt(attempt.attempt_id);
        const slipEvents = await this.attemptsRepository.listSlipEventsBetween(userId, timelineStart, endedAt);
        if (pendingSlip) {
            slipEvents.push({
                loggedAt: pendingSlip.loggedAt,
                cigarettesCount: pendingSlip.cigarettesCount,
            });
        }
        if (segments.length === 0) {
            const economics = this.buildEconomics({
                cigarettesPerDay: 0,
                cigarettesPerPack: 20,
                packPrice: null,
            });
            const slipCigarettes = slipEvents.reduce((sum, event) => sum + Math.max(0, event.cigarettesCount ?? 0), 0);
            return this.computeSnapshot(economics, timelineStart, endedAt, slipCigarettes);
        }
        return (0, segmented_attempt_impact_1.computeSegmentedAttemptImpact)(segments.map(segmented_attempt_impact_1.mapEconomicsSegmentRow), timelineStart, endedAt, slipEvents);
    }
    async getActiveAttempt(userId) {
        return this.attemptsRepository.findActive(userId);
    }
    async listCompletedAttempts(userId) {
        const rows = await this.attemptsRepository.listCompleted(userId);
        return rows.map((row) => this.toSummary(row));
    }
    toSummary(row) {
        return {
            attemptId: row.attempt_id,
            attemptNumber: row.attemptNumber,
            startedAt: row.startedAt.toISOString(),
            endedAt: row.endedAt?.toISOString() ?? null,
            endOutcome: row.endOutcome,
            durationSeconds: row.durationSeconds,
            cigarettesAvoided: row.cigarettesAvoided,
            moneySaved: row.moneySaved,
            lifeMinutesGained: row.lifeMinutesGained,
            slipCigarettesSmoked: row.slipCigarettesSmoked,
        };
    }
};
exports.AttemptsService = AttemptsService;
exports.AttemptsService = AttemptsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [attempts_repository_1.AttemptsRepository,
        economics_segments_repository_1.EconomicsSegmentsRepository])
], AttemptsService);
//# sourceMappingURL=attempts.service.js.map