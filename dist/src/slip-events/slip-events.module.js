"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlipEventsModule = void 0;
const common_1 = require("@nestjs/common");
const attempts_module_1 = require("../attempts/attempts.module");
const goals_module_1 = require("../goals/goals.module");
const users_module_1 = require("../users/users.module");
const slip_events_controller_1 = require("./slip-events.controller");
const slip_events_repository_1 = require("./slip-events.repository");
const slip_events_service_1 = require("./slip-events.service");
let SlipEventsModule = class SlipEventsModule {
};
exports.SlipEventsModule = SlipEventsModule;
exports.SlipEventsModule = SlipEventsModule = __decorate([
    (0, common_1.Module)({
        imports: [users_module_1.UsersModule, attempts_module_1.AttemptsModule, goals_module_1.GoalsModule],
        controllers: [slip_events_controller_1.SlipEventsController],
        providers: [slip_events_repository_1.SlipEventsRepository, slip_events_service_1.SlipEventsService],
    })
], SlipEventsModule);
//# sourceMappingURL=slip-events.module.js.map