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
exports.UpdateOnboardingDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const normalize_username_1 = require("../lib/normalize-username");
class OnboardingStep1Dto {
    quitReasons;
}
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], OnboardingStep1Dto.prototype, "quitReasons", void 0);
class OnboardingStep2Dto {
    motivation;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardingStep2Dto.prototype, "motivation", void 0);
class OnboardingStep3Dto {
    priorQuitAttempts;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardingStep3Dto.prototype, "priorQuitAttempts", void 0);
class OnboardingStep4Dto {
    primaryInterests;
}
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], OnboardingStep4Dto.prototype, "primaryInterests", void 0);
class OnboardingStep5Dto {
    username;
    sex;
    country;
    countryFlag;
    currency;
    quitDatePreset;
    quitDate;
}
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string'
        ? value.trim().toLowerCase().slice(0, normalize_username_1.USERNAME_MAX_LENGTH)
        : value),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(normalize_username_1.USERNAME_MAX_LENGTH),
    __metadata("design:type", String)
], OnboardingStep5Dto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardingStep5Dto.prototype, "sex", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardingStep5Dto.prototype, "country", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardingStep5Dto.prototype, "countryFlag", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardingStep5Dto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardingStep5Dto.prototype, "quitDatePreset", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", String)
], OnboardingStep5Dto.prototype, "quitDate", void 0);
class OnboardingStep6Dto {
    cigarettesPerDay;
    cigarettesPerDayNote;
    packPrice;
    yearsSmoking;
    cigarettesPerPack;
}
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], OnboardingStep6Dto.prototype, "cigarettesPerDay", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardingStep6Dto.prototype, "cigarettesPerDayNote", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardingStep6Dto.prototype, "packPrice", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OnboardingStep6Dto.prototype, "yearsSmoking", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], OnboardingStep6Dto.prototype, "cigarettesPerPack", void 0);
class UpdateOnboardingDto {
    step1;
    step2;
    step3;
    step4;
    step5;
    step6;
}
exports.UpdateOnboardingDto = UpdateOnboardingDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => OnboardingStep1Dto),
    __metadata("design:type", OnboardingStep1Dto)
], UpdateOnboardingDto.prototype, "step1", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => OnboardingStep2Dto),
    __metadata("design:type", OnboardingStep2Dto)
], UpdateOnboardingDto.prototype, "step2", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => OnboardingStep3Dto),
    __metadata("design:type", OnboardingStep3Dto)
], UpdateOnboardingDto.prototype, "step3", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => OnboardingStep4Dto),
    __metadata("design:type", OnboardingStep4Dto)
], UpdateOnboardingDto.prototype, "step4", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => OnboardingStep5Dto),
    __metadata("design:type", OnboardingStep5Dto)
], UpdateOnboardingDto.prototype, "step5", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => OnboardingStep6Dto),
    __metadata("design:type", OnboardingStep6Dto)
], UpdateOnboardingDto.prototype, "step6", void 0);
//# sourceMappingURL=update-onboarding.dto.js.map