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
const client_1 = require("@prisma/client");
let ScansService = class ScansService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findRecent() {
        return this.prisma.scan.findMany({
            take: 20,
            orderBy: { scanned_at: 'desc' },
            include: {
                asset: { include: { category: true } },
                user: { select: { id: true, name: true, email: true, role: true } },
                location: true,
            },
        });
    }
    async registerScan(dto, userIdFromToken) {
        if (!userIdFromToken) {
            throw new common_1.BadRequestException('L\'identifiant de l\'utilisateur est requis');
        }
        const asset = await this.prisma.asset.findUnique({
            where: { id: dto.asset_id },
            include: { location: true },
        });
        if (!asset)
            throw new common_1.NotFoundException(`L'actif ${dto.asset_id} est introuvable`);
        const newLocation = await this.prisma.location.findUnique({
            where: { id: dto.location_id },
        });
        if (!newLocation)
            throw new common_1.NotFoundException(`Zone ${dto.location_id} introuvable`);
        const movementDetected = asset.location_id !== dto.location_id;
        return this.prisma.$transaction(async (tx) => {
            await tx.asset.update({
                where: { id: dto.asset_id },
                data: { status: dto.status, location_id: dto.location_id },
            });
            const scan = await tx.scan.create({
                data: {
                    asset_id: dto.asset_id,
                    user_id: userIdFromToken,
                    location_id: dto.location_id,
                    status: dto.status,
                }
            });
            if (dto.status === "TO_REPLACE" || dto.status === "DAMAGED") {
                await tx.alert.create({
                    data: {
                        asset_id: asset.id,
                        type: dto.status === "TO_REPLACE" ? client_1.AlertType.REPLACE : client_1.AlertType.DAMAGED,
                        status: client_1.AlertStatus.OPEN,
                        comment: dto.comment,
                        image_url: dto.image_data,
                    },
                });
            }
            await tx.assetHistory.create({
                data: {
                    asset_id: dto.asset_id,
                    user_id: userIdFromToken,
                    action: dto.comment ? `Constat : ${dto.comment}` : `Audit effectué`,
                },
            });
            return { ...scan, movementDetected };
        });
    }
    async registerMassScan(dto, userId) {
        const location = await this.prisma.location.findUnique({
            where: { id: dto.location_id }
        });
        if (!location)
            throw new common_1.NotFoundException('Zone de masse introuvable');
        const assets = await this.prisma.asset.findMany({
            where: { tag_id: { in: dto.tag_ids } },
        });
        if (assets.length === 0)
            throw new common_1.BadRequestException('Aucun tag valide détecté');
        return this.prisma.$transaction(async (tx) => {
            for (const asset of assets) {
                await tx.asset.update({
                    where: { id: asset.id },
                    data: { location_id: dto.location_id, status: dto.status }
                });
                await tx.scan.create({
                    data: {
                        asset_id: asset.id,
                        user_id: userId,
                        location_id: dto.location_id,
                        status: dto.status,
                    }
                });
            }
            return { count: assets.length, message: "Inventaire de masse réussi" };
        });
    }
};
exports.ScansService = ScansService;
exports.ScansService = ScansService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ScansService);
//# sourceMappingURL=scans.service.js.map