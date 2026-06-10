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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlipEventsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/guards/jwt.guard");
const create_slip_event_dto_1 = require("./dto/create-slip-event.dto");
const slip_events_service_1 = require("./slip-events.service");
let SlipEventsController = class SlipEventsController {
    slipEventsService;
    constructor(slipEventsService) {
        this.slipEventsService = slipEventsService;
    }
    create(req, dto) {
        return this.slipEventsService.create(req.user.userId, dto);
    }
    remove(req, id) {
        return this.slipEventsService.remove(req.user.userId, id);
    }
};
exports.SlipEventsController = SlipEventsController;
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_slip_event_dto_1.CreateSlipEventDto]),
    __metadata("design:returntype", void 0)
], SlipEventsController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], SlipEventsController.prototype, "remove", null);
exports.SlipEventsController = SlipEventsController = __decorate([
    (0, common_1.Controller)('auth/me/slip-events'),
    __metadata("design:paramtypes", [slip_events_service_1.SlipEventsService])
], SlipEventsController);
//# sourceMappingURL=slip-events.controller.js.map