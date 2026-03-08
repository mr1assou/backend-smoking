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
exports.AssetsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AssetsService = class AssetsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByTag(tagId) {
        const asset = await this.prisma.asset.findUnique({
            where: { tag_id: tagId },
            include: {
                category: true,
                location: true,
                scans: {
                    orderBy: { scanned_at: 'desc' },
                    take: 1,
                },
            },
        });
        if (!asset) {
            throw new common_1.NotFoundException(`Asset with tag ${tagId} not found`);
        }
        return this.mapToOutput(asset);
    }
    async findAll() {
        const assets = await this.prisma.asset.findMany({
            include: {
                category: true,
                location: true,
                scans: {
                    orderBy: { scanned_at: 'desc' },
                    take: 1,
                },
            },
        });
        return assets.map(asset => this.mapToOutput(asset));
    }
    async create(dto) {
        const asset = await this.prisma.asset.create({
            data: {
                tag_id: dto.tag_id,
                name: dto.name,
                category_id: dto.category_id,
                brand: dto.brand,
                model: dto.model,
                supplier_id: dto.supplier_id,
                purchase_date: new Date(dto.purchase_date),
                price: dto.price,
                warranty_end: dto.warranty_end ? new Date(dto.warranty_end) : null,
                location_id: dto.location_id,
                status: dto.status || client_1.AssetStatus.GOOD,
            },
            include: {
                category: true,
                location: true,
                scans: {
                    orderBy: { scanned_at: 'desc' },
                    take: 1,
                },
            },
        });
        return this.mapToOutput(asset);
    }
    mapToOutput(asset) {
        const netValue = this.calculateNetValue(Number(asset.price), asset.purchase_date);
        return {
            id: asset.id,
            nom: asset.name,
            categorie: asset.category.name,
            etat: asset.status,
            prix_achat: Number(asset.price),
            annee_achat: asset.purchase_date.getFullYear(),
            localisation: asset.location.name,
            valeur_net: `${netValue.toFixed(2)} €`,
            dernier_scan: asset.scans[0]?.scanned_at || null,
            marque: asset.brand,
        };
    }
    calculateNetValue(price, purchaseDate) {
        const now = new Date();
        const diffInMs = now.getTime() - purchaseDate.getTime();
        const yearsPassed = diffInMs / (1000 * 60 * 60 * 24 * 365.25);
        const usefulLife = 5;
        const depreciation = (price / usefulLife) * yearsPassed;
        const netValue = price - depreciation;
        return Math.max(0, netValue);
    }
};
exports.AssetsService = AssetsService;
exports.AssetsService = AssetsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AssetsService);
//# sourceMappingURL=assets.service.js.map