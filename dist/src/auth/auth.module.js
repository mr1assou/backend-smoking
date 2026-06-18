"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const goals_module_1 = require("../goals/goals.module");
const presence_module_1 = require("../presence/presence.module");
const slip_events_module_1 = require("../slip-events/slip-events.module");
const stats_module_1 = require("../stats/stats.module");
const users_module_1 = require("../users/users.module");
const users_controller_1 = require("../users/users.controller");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const jwt_refresh_strategy_1 = require("./strategies/jwt-refresh.strategy");
const google_oauth_service_1 = require("./google/google-oauth.service");
const google_token_service_1 = require("./google/google-token.service");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule,
            jwt_1.JwtModule.register({}),
            presence_module_1.PresenceModule,
            users_module_1.UsersModule,
            slip_events_module_1.SlipEventsModule,
            stats_module_1.StatsModule,
            goals_module_1.GoalsModule,
        ],
        controllers: [auth_controller_1.AuthController, users_controller_1.UsersController],
        providers: [
            auth_service_1.AuthService,
            google_token_service_1.GoogleTokenService,
            google_oauth_service_1.GoogleOAuthService,
            jwt_strategy_1.JwtStrategy,
            jwt_refresh_strategy_1.JwtRefreshStrategy,
        ],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map