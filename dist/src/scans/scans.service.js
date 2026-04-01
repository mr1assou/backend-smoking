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
const files_service_1 = require("../files/files.service");
const client_1 = require("@prisma/client");
let ScansService = class ScansService {
    prisma;
    filesService;
    constructor(prisma, filesService) {
        this.prisma = prisma;
        this.filesService = filesService;
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
            throw new common_1.BadRequestException("L'identifiant de l'utilisateur est requis");
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!dto.location_id || !uuidRegex.test(dto.location_id)) {
            throw new common_1.BadRequestException('Erreur de synchronisation : Le location_id fourni est manquant ou invalide.');
        }
        const asset = await this.prisma.asset.findUnique({
            where: { id: dto.asset_id },
            include: { location: true },
        });
        if (!asset) {
            console.error(`[Scan] Asset non trouvé: ${dto.asset_id}`);
            throw new common_1.NotFoundException(`L'objet avec l'ID ${dto.asset_id} est introuvable dans la base de données.`);
        }
        if (asset.tag_id !== dto.tag_id) {
            console.error(`[Scan] Mismatch Tag! Attendu: ${asset.tag_id}, Reçu: ${dto.tag_id}`);
            throw new common_1.BadRequestException(`Le tag RFID (${dto.tag_id}) ne correspond pas à l'asset sélectionné.`);
        }
        const newLocation = await this.prisma.location.findUnique({
            where: { id: dto.location_id },
        });
        if (!newLocation)
            throw new common_1.NotFoundException(`Zone ${dto.location_id} introuvable`);
        let photoUrl;
        if (dto.image_data) {
            photoUrl = await this.filesService.saveBase64Image(dto.image_data);
        }
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
                },
            });
            if (movementDetected) {
                await tx.assetMovement.create({
                    data: {
                        asset_id: dto.asset_id,
                        from_location_id: asset.location_id,
                        to_location_id: dto.location_id,
                        user_id: userIdFromToken,
                        scan_id: scan.id,
                    },
                });
            }
            if (dto.status === 'TO_REPLACE' || dto.status === 'DAMAGED') {
                await tx.alert.create({
                    data: {
                        asset_id: asset.id,
                        location_id: dto.location_id,
                        type: dto.status === 'TO_REPLACE'
                            ? client_1.AlertType.REPLACE
                            : client_1.AlertType.DAMAGED,
                        status: client_1.AlertStatus.OPEN,
                        comment: dto.comment,
                        photo_url: photoUrl,
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
            return { ...scan, movementDetected, photoUrl };
        });
    }
    async registerMassScan(dto, userId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!dto.location_id || !uuidRegex.test(dto.location_id)) {
            throw new common_1.BadRequestException('Erreur de synchronisation : Le location_id de masse fourni est manquant ou invalide.');
        }
        console.log(`[MassScan] Inventaire de ${dto.tag_ids.length} tags dans la zone ${dto.location_id}`);
        const location = await this.prisma.location.findUnique({
            where: { id: dto.location_id },
        });
        if (!location) {
            throw new common_1.NotFoundException(`La zone d'inventaire (${dto.location_id}) est introuvable.`);
        }
        const assets = await this.prisma.asset.findMany({
            where: { tag_id: { in: dto.tag_ids } },
        });
        if (assets.length === 0)
            throw new common_1.BadRequestException('Aucun tag valide détecté');
        return this.prisma.$transaction(async (tx) => {
            for (const asset of assets) {
                const isMoved = asset.location_id !== dto.location_id;
                await tx.asset.update({
                    where: { id: asset.id },
                    data: { location_id: dto.location_id, status: dto.status },
                });
                const scan = await tx.scan.create({
                    data: {
                        asset_id: asset.id,
                        user_id: userId,
                        location_id: dto.location_id,
                        status: dto.status,
                    },
                });
                if (isMoved) {
                    await tx.assetMovement.create({
                        data: {
                            asset_id: asset.id,
                            from_location_id: asset.location_id,
                            to_location_id: dto.location_id,
                            user_id: userId,
                            scan_id: scan.id,
                        },
                    });
                }
                await tx.assetHistory.create({
                    data: {
                        asset_id: asset.id,
                        user_id: userId,
                        action: `Audit de masse effectué (Zone: ${location.name})`,
                    },
                });
            }
            return { count: assets.length, message: 'Inventaire de masse réussi' };
        });
    }
};
exports.ScansService = ScansService;
exports.ScansService = ScansService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        files_service_1.FilesService])
], ScansService);
//# sourceMappingURL=scans.service.js.map