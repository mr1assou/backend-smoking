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
const goals_repository_1 = require("../goals/goals.repository");
const users_repository_1 = require("../users/users.repository");
const lib_1 = require("./lib");
const goals_stats_builder_1 = require("./lib/goals-stats.builder");
let StatsService = class StatsService {
    usersRepository;
    attemptsRepository;
    attemptsService;
    goalsRepository;
    constructor(usersRepository, attemptsRepository, attemptsService, goalsRepository) {
        this.usersRepository = usersRepository;
        this.attemptsRepository = attemptsRepository;
        this.attemptsService = attemptsService;
        this.goalsRepository = goalsRepository;
    }
    async getOverview(userId) {
        const context = await (0, lib_1.loadStatsUserContext)(userId, this.usersRepository, this.attemptsRepository, this.attemptsService);
        const attempts = await (0, lib_1.buildAttemptsList)(userId, context.activeTimelineStart, context.active, context.activeSnapshot, context.now, this.attemptsRepository, this.attemptsService);
        return {
            currency: context.currency,
            economics: {
                cigarettesPerDay: context.economics.cigarettesPerDay,
                cigarettesPerPack: context.economics.cigarettesPerPack,
                packCost: context.economics.packPrice,
            },
            byRange: (0, lib_1.computeOverviewByRange)(attempts, context.economics, context.now.getTime()),
        };
    }
    async getAttempts(userId) {
        const context = await (0, lib_1.loadStatsUserContext)(userId, this.usersRepository, this.attemptsRepository, this.attemptsService);
        const attempts = await (0, lib_1.buildAttemptsList)(userId, context.activeTimelineStart, context.active, context.activeSnapshot, context.now, this.attemptsRepository, this.attemptsService);
        return {
            currency: context.currency,
            economics: {
                cigarettesPerDay: context.economics.cigarettesPerDay,
                cigarettesPerPack: context.economics.cigarettesPerPack,
                packCost: context.economics.packPrice,
            },
            attempts,
        };
    }
    async getGoals(userId) {
        const user = await this.usersRepository.findById(userId);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const rows = await this.goalsRepository.listAllForUser(userId);
        return {
            currency: user.currency ?? 'USD',
            goals: rows.map((row) => (0, goals_stats_builder_1.toGoalStatsRow)(row)),
        };
    }
};
exports.StatsService = StatsService;
exports.StatsService = StatsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_repository_1.UsersRepository,
        attempts_repository_1.AttemptsRepository,
        attempts_service_1.AttemptsService,
        goals_repository_1.GoalsRepository])
], StatsService);
//# sourceMappingURL=stats.service.js.map