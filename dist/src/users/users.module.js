"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersModule = void 0;
const common_1 = require("@nestjs/common");
const attempts_module_1 = require("../attempts/attempts.module");
const badges_module_1 = require("../badges/badges.module");
const freedom_points_module_1 = require("../freedom-points/freedom-points.module");
const prisma_module_1 = require("../prisma/prisma.module");
const storage_module_1 = require("../storage/storage.module");
const users_repository_1 = require("./users.repository");
const users_service_1 = require("./users.service");
let UsersModule = class UsersModule {
};
exports.UsersModule = UsersModule;
exports.UsersModule = UsersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            attempts_module_1.AttemptsModule,
            storage_module_1.StorageModule,
            badges_module_1.BadgesModule,
            freedom_points_module_1.FreedomPointsModule,
        ],
        providers: [users_repository_1.UsersRepository, users_service_1.UsersService],
        exports: [users_service_1.UsersService, users_repository_1.UsersRepository],
    })
], UsersModule);
//# sourceMappingURL=users.module.js.map