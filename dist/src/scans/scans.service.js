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
exports.ScansService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ScansService = class ScansService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async registerScan(dto, userIdFromToken) {
        const finalUserId = userIdFromToken || dto.user_id;
        if (!finalUserId) {
            throw new Error('User ID is required for scanning');
        }
        const asset = await this.prisma.asset.findUnique({
            where: { id: dto.asset_id },
        });
        if (!asset) {
            throw new common_1.NotFoundException(`Asset ${dto.asset_id} not found`);
        }
        const oldLocationId = asset.location_id;
        return this.prisma.$transaction(async (tx) => {
            const updatedAsset = await tx.asset.update({
                where: { id: dto.asset_id },
                data: {
                    status: dto.status,
                    location_id: dto.location_id,
                },
            });
            const scan = await tx.scan.create({
                data: {
                    asset_id: dto.asset_id,
                    user_id: finalUserId,
                    location_id: dto.location_id,
                    status: dto.status,
                    scanned_at: new Date(),
                },
                include: {
                    asset: {
                        include: {
                            category: true,
                            location: true,
                        }
                    }
                }
            });
            await tx.assetHistory.create({
                data: {
                    asset_id: dto.asset_id,
                    user_id: finalUserId,
                    action: `SCAN [STATUS: ${dto.status}] [LOCATION: ${dto.location_id}]`,
                    timestamp: new Date(),
                },
            });
            if (oldLocationId !== dto.location_id) {
                await tx.assetMovement.create({
                    data: {
                        asset_id: dto.asset_id,
                        from_location_id: oldLocationId,
                        to_location_id: dto.location_id,
                        moved_at: new Date(),
                    },
                });
            }
            return scan;
        });
    }
};
exports.ScansService = ScansService;
exports.ScansService = ScansService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ScansService);
//# sourceMappingURL=scans.service.js.map