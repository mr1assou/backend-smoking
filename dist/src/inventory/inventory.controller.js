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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const inventory_service_1 = require("./inventory.service");
const create_session_dto_1 = require("./dto/create-session.dto");
const submit_tags_dto_1 = require("./dto/submit-tags.dto");
const jwt_guard_1 = require("../auth/guards/jwt.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let InventoryController = class InventoryController {
    inventoryService;
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    async createSession(req, dto) {
        const userId = req.user.id || req.user.sub;
        return this.inventoryService.createSession(dto, userId);
    }
    async submitTags(req, id, dto) {
        const userId = req.user.id || req.user.sub;
        return this.inventoryService.submitTags(id, dto, userId);
    }
    async closeSession(id) {
        return this.inventoryService.closeSession(id);
    }
    async findActive(req) {
        const userId = req.user.id || req.user.sub;
        return this.inventoryService.findActiveSessions(userId);
    }
    async findAll() {
        return this.inventoryService.findAll();
    }
    async findOne(id) {
        return this.inventoryService.findOne(id);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Post)('sessions'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AUDITOR, client_1.UserRole.ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_session_dto_1.CreateSessionDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "createSession", null);
__decorate([
    (0, common_1.Post)('sessions/:id/tags'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AUDITOR, client_1.UserRole.ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, submit_tags_dto_1.SubmitTagsDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "submitTags", null);
__decorate([
    (0, common_1.Patch)('sessions/:id/close'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AUDITOR, client_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "closeSession", null);
__decorate([
    (0, common_1.Get)('sessions/active'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AUDITOR, client_1.UserRole.ADMIN),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "findActive", null);
__decorate([
    (0, common_1.Get)('sessions'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AUDITOR, client_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('sessions/:id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AUDITOR, client_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "findOne", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.Controller)('inventory'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map