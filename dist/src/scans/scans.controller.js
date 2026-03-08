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
exports.ScansController = void 0;
const common_1 = require("@nestjs/common");
const scans_service_1 = require("./scans.service");
const create_scan_dto_1 = require("./dto/create-scan.dto");
const jwt_guard_1 = require("../auth/guards/jwt.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const create_mass_scan_dto_1 = require("./dto/create-mass-scan.dto");
let ScansController = class ScansController {
    scansService;
    constructor(scansService) {
        this.scansService = scansService;
    }
    async getRecent() {
        return this.scansService.findRecent();
    }
    async createScan(req, dto) {
        const userId = req.user.id || req.user.sub;
        return this.scansService.registerScan(dto, userId);
    }
    async createMassScan(req, dto) {
        const userId = req.user.id || req.user.sub;
        return this.scansService.registerMassScan(dto, userId);
    }
};
exports.ScansController = ScansController;
__decorate([
    (0, common_1.Get)('recent'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AUDITOR, client_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScansController.prototype, "getRecent", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AUDITOR, client_1.UserRole.ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_scan_dto_1.CreateScanDto]),
    __metadata("design:returntype", Promise)
], ScansController.prototype, "createScan", null);
__decorate([
    (0, common_1.Post)('mass'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AUDITOR, client_1.UserRole.ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_mass_scan_dto_1.CreateMassScanDto]),
    __metadata("design:returntype", Promise)
], ScansController.prototype, "createMassScan", null);
exports.ScansController = ScansController = __decorate([
    (0, common_1.Controller)('scan'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [scans_service_1.ScansService])
], ScansController);
//# sourceMappingURL=scans.controller.js.map