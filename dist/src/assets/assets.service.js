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
                supplier: true,
                movements: {
                    include: {
                        from_location: true,
                        to_location: true,
                        user: true,
                    },
                    orderBy: { moved_at: 'desc' },
                },
                scans: {
                    include: {
                        user: true,
                        location: true,
                    },
                    orderBy: { scanned_at: 'desc' },
                    take: 5,
                },
            },
        });
        if (!asset) {
            throw new common_1.NotFoundException(`Asset with tag ${tagId} not found`);
        }
        const mapped = this.mapToOutput(asset);
        return {
            ...asset,
            ...mapped
        };
    }
    async findOne(id) {
        const asset = await this.prisma.asset.findUnique({
            where: { id },
            include: {
                category: true,
                location: true,
                supplier: true,
                movements: true
            },
        });
        if (!asset) {
            throw new common_1.NotFoundException(`Asset with id ${id} not found`);
        }
        console.log('Actif trouvé:', asset);
        const mapped = this.mapToOutput(asset);
        return {
            ...asset,
            ...mapped
        };
    }
    async findAll() {
        const assets = await this.prisma.asset.findMany({
            include: {
                category: true,
                location: true,
                supplier: true,
                scans: {
                    orderBy: { scanned_at: 'desc' },
                    take: 1,
                },
            },
        });
        return assets.map(asset => this.mapToOutput(asset));
    }
    async resetAll() {
        const tables = [
            'asset_movements',
            'scans',
            'alerts',
            'asset_history',
            'assets',
            'locations',
            'categories',
            'reports',
            'suppliers',
            'users'
        ];
        console.log('--- RESET COMPLET DE LA BASE DE DONNÉES ---');
        try {
            const admin = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
            for (const table of tables) {
                if (table === 'users' && admin) {
                    await this.prisma.$executeRawUnsafe(`DELETE FROM "users" WHERE id != '${admin.id}';`);
                    continue;
                }
                await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
            }
            return { message: 'Base de données réinitialisée avec succès' };
        }
        catch (error) {
            console.error('Erreur lors du Reset:', error);
            throw new Error('Erreur lors de la réinitialisation : ' + error.message);
        }
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
    async importAssets(fileBuffer) {
        const xlsx = require('xlsx');
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);
        const summary = {
            success: 0,
            errors: [],
            total: data.length
        };
        let mainHotel = await this.prisma.location.findFirst({ where: { type: 'HOTEL' } });
        if (!mainHotel) {
            mainHotel = await this.prisma.location.create({
                data: { name: 'Royal Mansour Marrakech', type: 'HOTEL' }
            });
        }
        let defaultSupplier = await this.prisma.supplier.findFirst({ where: { name: 'Maroc Bureau' } });
        if (!defaultSupplier) {
            defaultSupplier = await this.prisma.supplier.create({
                data: { name: 'Maroc Bureau', contact_email: 'contact@marocbureau.ma' }
            });
        }
        const admin = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
        for (const [index, row] of data.entries()) {
            try {
                const rawRow = row;
                const r = {};
                Object.keys(rawRow).forEach(key => {
                    const normalizedKey = key.toLowerCase().trim();
                    r[normalizedKey] = rawRow[key];
                });
                const tag_id = (r["id (tag rfid)"] || r["tag_id"] || r["rfid"] || r["id"])?.toString()?.trim();
                const name = (r["nom"] || r["name"])?.toString()?.trim();
                const category_name = (r["catégorie"] || r["categorie"] || r["category"])?.toString() || 'Mobilier';
                const location_name = (r["localisation"] || r["location"] || r["emplacement"])?.toString() || 'Entrepôt';
                const price = parseFloat(r["prix d'achat"] || r["prix"] || r["purchase_price"]) || 0;
                const purchase_year = parseInt(r["année d'achat"] || r["annee"] || r["purchase_year"]) || new Date().getFullYear();
                const brand = (r["marque"] || r["brand"])?.toString() || 'Haworth';
                if (!tag_id || !name)
                    continue;
                await this.prisma.$transaction(async (tx) => {
                    const category = await tx.category.upsert({
                        where: { name: category_name },
                        update: {},
                        create: { name: category_name }
                    });
                    let location = await tx.location.findFirst({ where: { name: location_name } });
                    if (!location) {
                        location = await tx.location.create({
                            data: { name: location_name, type: 'ZONE', parent_id: mainHotel?.id }
                        });
                    }
                    const purchaseDate = new Date(purchase_year, 0, 1);
                    const asset = await tx.asset.upsert({
                        where: { tag_id: tag_id },
                        update: {
                            name,
                            category_id: category.id,
                            location_id: location.id,
                            price: price,
                            purchase_date: purchaseDate,
                            brand: brand
                        },
                        create: {
                            tag_id: tag_id,
                            name,
                            category_id: category.id,
                            location_id: location.id,
                            supplier_id: defaultSupplier?.id || '',
                            price: price,
                            purchase_date: purchaseDate,
                            brand: brand,
                            model: 'Compose-Series'
                        }
                    });
                    await tx.assetMovement.create({
                        data: {
                            asset_id: asset.id,
                            to_location_id: location.id,
                            user_id: admin?.id || (await tx.user.findFirst())?.id || '',
                            moved_at: purchaseDate
                        }
                    });
                });
                summary.success++;
            }
            catch (error) {
                summary.errors.push({ line: index + 2, error: error.message });
            }
        }
        return summary;
    }
    mapToOutput(asset) {
        const netValue = this.calculateNetValue(Number(asset.price), asset.purchase_date);
        const statusLabels = {
            [client_1.AssetStatus.GOOD]: 'BON ÉTAT',
            [client_1.AssetStatus.DAMAGED]: 'ABÎMÉ',
            [client_1.AssetStatus.REPAIR]: 'EN RÉPARATION',
            [client_1.AssetStatus.BROKEN]: 'HS (CASSÉ)',
            [client_1.AssetStatus.TO_REPLACE]: 'À REMPLACER',
        };
        const statusColors = {
            [client_1.AssetStatus.GOOD]: 'emerald',
            [client_1.AssetStatus.DAMAGED]: 'amber',
            [client_1.AssetStatus.REPAIR]: 'sky',
            [client_1.AssetStatus.BROKEN]: 'rose',
            [client_1.AssetStatus.TO_REPLACE]: 'rose',
        };
        return {
            id: asset.id,
            tag_id: asset.tag_id,
            rfid: asset.tag_id,
            name: asset.name,
            category: asset.category.name,
            location: asset.location.name,
            status: statusColors[asset.status] || 'sky',
            statusLabel: statusLabels[asset.status] || asset.status,
            brand: asset.brand,
            model: asset.model,
            purchase_price: Number(asset.price),
            price: Number(asset.price),
            value: Number(asset.price),
            net_value: `${netValue.toFixed(2)} DH`,
            purchase_year: asset.purchase_date.getFullYear(),
            purchase_date: asset.purchase_date,
            warranty_end: asset.warranty_end,
            last_scan: asset.scans && asset.scans[0] ? asset.scans[0].scanned_at : null,
            supplier: asset.supplier?.name || 'Inconnu',
            movements: (asset.movements || []).map((m) => ({
                id: m.id,
                date: m.moved_at,
                label: m.from_location_id ? 'Déplacement d\'actif' : 'Achat et réception - Entrepôt',
                location: m.to_location?.name || 'Inconnu',
                from: m.from_location?.name,
                user: m.user?.name || 'Système',
                type: m.from_location_id ? 'movement' : 'purchase'
            })),
            scans: asset.scans || [],
        };
    }
    calculateNetValue(price, purchaseDate) {
        const now = new Date();
        const diffInMs = now.getTime() - purchaseDate.getTime();
        const yearsPassed = diffInMs / (1000 * 60 * 60 * 24 * 365.25);
        const netValue = price - (price / 5) * yearsPassed;
        return Math.max(0, netValue);
    }
    getTemplate() {
        const xlsx = require('xlsx');
        const headers = ["ID (TAG RFID)", "Nom", "Catégorie", "Prix d'achat", "Localisation", "Marque", "Année d'achat"];
        const worksheet = xlsx.utils.aoa_to_sheet([headers]);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Template");
        return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
};
exports.AssetsService = AssetsService;
exports.AssetsService = AssetsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AssetsService);
//# sourceMappingURL=assets.service.js.map