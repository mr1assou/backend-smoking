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
const attempt_impact_1 = require("../stats/attempt-impact");
const attempts_repository_1 = require("./attempts.repository");
let AttemptsService = class AttemptsService {
    attemptsRepository;
    constructor(attemptsRepository) {
        this.attemptsRepository = attemptsRepository;
    }
    async ensureFirstAttempt(userId, startedAt) {
        const active = await this.attemptsRepository.findActive(userId);
        if (active)
            return active;
        const count = await this.attemptsRepository.countForUser(userId);
        if (count > 0) {
            return this.attemptsRepository.createNext(userId, count + 1, startedAt);
        }
        return this.attemptsRepository.createFirst(userId, startedAt);
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
    __metadata("design:paramtypes", [attempts_repository_1.AttemptsRepository])
], AttemptsService);
//# sourceMappingURL=attempts.service.js.map