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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/guards/jwt.guard");
const reset_journey_dto_1 = require("./dto/reset-journey.dto");
const update_habit_settings_dto_1 = require("./dto/update-habit-settings.dto");
const update_onboarding_dto_1 = require("./dto/update-onboarding.dto");
const update_profile_image_dto_1 = require("./dto/update-profile-image.dto");
const update_user_preferences_dto_1 = require("./dto/update-user-preferences.dto");
const users_service_1 = require("./users.service");
let UsersController = class UsersController {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    getMe(req) {
        return this.usersService.getMe(req.user.userId);
    }
    saveOnboarding(req, dto) {
        return this.usersService.updateOnboarding(req.user.userId, dto);
    }
    updatePreferences(req, dto) {
        return this.usersService.updatePreferences(req.user.userId, dto);
    }
    updateProfileImage(req, dto) {
        return this.usersService.updateProfileImage(req.user.userId, dto);
    }
    updateHabitSettings(req, dto) {
        return this.usersService.updateHabitSettings(req.user.userId, dto);
    }
    resetJourney(req, dto) {
        return this.usersService.resetJourney(req.user.userId, dto);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getMe", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Patch)('me/onboarding'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_onboarding_dto_1.UpdateOnboardingDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "saveOnboarding", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Patch)('me/preferences'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_user_preferences_dto_1.UpdateUserPreferencesDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updatePreferences", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Patch)('me/profile-image'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_image_dto_1.UpdateProfileImageDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateProfileImage", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Patch)('me/habit-settings'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_habit_settings_dto_1.UpdateHabitSettingsDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateHabitSettings", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Post)('me/reset-journey'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, reset_journey_dto_1.ResetJourneyDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "resetJourney", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map