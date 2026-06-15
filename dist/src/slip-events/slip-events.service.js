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
exports.SlipEventsService = void 0;
const common_1 = require("@nestjs/common");
const utc_instant_1 = require("../common/utc-instant");
const users_repository_1 = require("../users/users.repository");
const lib_1 = require("./lib");
const slip_events_repository_1 = require("./slip-events.repository");
let SlipEventsService = class SlipEventsService {
    slipEventsRepository;
    usersRepository;
    constructor(slipEventsRepository, usersRepository) {
        this.slipEventsRepository = slipEventsRepository;
        this.usersRepository = usersRepository;
    }
    async create(userId, dto) {
        const user = await this.usersRepository.findById(userId);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const fallback = (0, utc_instant_1.utcInstantNow)();
        const previousStreakStart = user.streakStart ?? user.quitDate ?? fallback;
        const previousQuitDate = user.quitDate ?? previousStreakStart;
        const cigarettesCount = (0, lib_1.resolveSlipCigarettesCount)(dto.outcome, dto.cigarettesCount);
        const { event, streakStart, quitDate, currentAttemptNumber } = await this.slipEventsRepository.createWithAttemptRotation({
            userId,
            outcome: dto.outcome,
            cigarettesCount,
            previousStreakStart,
            previousQuitDate,
            cigarettesPerDay: user.cigarettesPerDay ?? 0,
            cigarettesPerPack: user.cigarettesPerPack ?? 20,
            packPrice: user.packPrice,
        });
        return {
            slipEventId: event.slip_event_id,
            outcome: event.outcome,
            cigarettesCount: event.cigarettesCount ?? undefined,
            streakStart: (0, utc_instant_1.toUtcIso)(streakStart),
            quitDate: (0, utc_instant_1.toUtcIso)(quitDate),
            previousStreakStart: (0, utc_instant_1.toUtcIso)(previousStreakStart),
            closedAttemptId: event.closedAttemptId ?? undefined,
            newAttemptId: event.newAttemptId ?? undefined,
            currentAttemptNumber,
        };
    }
    async remove(userId, slipEventId) {
        const event = await this.slipEventsRepository.findOwnedById(userId, slipEventId);
        if (!event)
            throw new common_1.NotFoundException('Slip event not found');
        const restored = await this.slipEventsRepository.deleteOwnedAndRestoreAttempt(userId, slipEventId, event);
        return {
            streakStart: restored.streakStart ? (0, utc_instant_1.toUtcIso)(restored.streakStart) : null,
            quitDate: restored.quitDate ? (0, utc_instant_1.toUtcIso)(restored.quitDate) : null,
            currentAttemptNumber: restored.currentAttemptNumber ?? undefined,
        };
    }
};
exports.SlipEventsService = SlipEventsService;
exports.SlipEventsService = SlipEventsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [slip_events_repository_1.SlipEventsRepository,
        users_repository_1.UsersRepository])
], SlipEventsService);
//# sourceMappingURL=slip-events.service.js.map