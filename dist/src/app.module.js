"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const serve_static_1 = require("@nestjs/serve-static");
const path = __importStar(require("path"));
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const assets_module_1 = require("./assets/assets.module");
const scans_module_1 = require("./scans/scans.module");
const locations_module_1 = require("./locations/locations.module");
const ai_module_1 = require("./ai/ai.module");
const alerts_module_1 = require("./alerts/alerts.module");
const files_module_1 = require("./files/files.module");
const schedule_1 = require("@nestjs/schedule");
const inventory_module_1 = require("./inventory/inventory.module");
const analytics_module_1 = require("./analytics/analytics.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: path.join(process.cwd(), 'uploads'),
                serveRoot: '/uploads',
            }),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            assets_module_1.AssetsModule,
            scans_module_1.ScansModule,
            locations_module_1.LocationsModule,
            ai_module_1.AiModule,
            alerts_module_1.AlertsModule,
            files_module_1.FilesModule,
            inventory_module_1.InventoryModule,
            analytics_module_1.AnalyticsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map