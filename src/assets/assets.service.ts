import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Asset, AssetStatus } from '@prisma/client';
import { AssetOutputDto } from './dto/asset-output.dto';

@Injectable()
export class AssetsService {
    constructor(private prisma: PrismaService) { }

    async findByTag(tagId: string): Promise<any> {
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
            throw new NotFoundException(`Asset with tag ${tagId} not found`);
        }

        const mapped = this.mapToOutput(asset);
        
        return {
            ...asset,
            ...mapped
        };
    }

    async findOne(id: string): Promise<any> {
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
            throw new NotFoundException(`Asset with id ${id} not found`);
        }

        console.log('Actif trouvé:', asset);

        const mapped = this.mapToOutput(asset);
        
        return {
            ...asset,
            ...mapped
        };
    }

    async findAll(): Promise<any[]> {
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
            'users' // Be careful with users, but if it's a full dev reset...
        ];
        
        console.log('--- RESET COMPLET DE LA BASE DE DONNÉES ---');
        
        try {
            // We keep the first admin user to avoid complete lockout
            const admin = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
            
            for (const table of tables) {
                if (table === 'users' && admin) {
                    await this.prisma.$executeRawUnsafe(`DELETE FROM "users" WHERE id != '${admin.id}';`);
                    continue;
                }
                await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
            }
            return { message: 'Base de données réinitialisée avec succès' };
        } catch (error) {
            console.error('Erreur lors du Reset:', error);
            throw new Error('Erreur lors de la réinitialisation : ' + error.message);
        }
    }

    async create(dto: any): Promise<any> {
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
                status: dto.status || AssetStatus.GOOD,
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

    async importAssets(fileBuffer: Buffer) {
        const xlsx = require('xlsx');
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        const summary = {
            success: 0,
            errors: [] as any[],
            total: data.length
        };

        // Task 1: Find or Create Root Hotel
        let mainHotel = await this.prisma.location.findFirst({ where: { type: 'HOTEL' } });
        if (!mainHotel) {
            mainHotel = await this.prisma.location.create({ 
                data: { name: 'Royal Mansour Marrakech', type: 'HOTEL' } 
            });
        }

        // Supplier par défaut
        let defaultSupplier = await this.prisma.supplier.findFirst({ where: { name: 'Maroc Bureau' } });
        if (!defaultSupplier) {
            defaultSupplier = await this.prisma.supplier.create({ 
                data: { name: 'Maroc Bureau', contact_email: 'contact@marocbureau.ma' } 
            });
        }

        // Get an admin for movements
        const admin = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });

        for (const [index, row] of data.entries()) {
            try {
                const rawRow = row as any;
                const r: any = {};
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

                if (!tag_id || !name) continue;

                await this.prisma.$transaction(async (tx) => {
                    // Category
                    const category = await tx.category.upsert({
                        where: { name: category_name },
                        update: {},
                        create: { name: category_name }
                    });

                    // Location
                    let location = await tx.location.findFirst({ where: { name: location_name } });
                    if (!location) {
                        location = await tx.location.create({ 
                            data: { name: location_name, type: 'ZONE', parent_id: mainHotel?.id } 
                        });
                    }

                    const purchaseDate = new Date(purchase_year, 0, 1);

                    // Asset
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

                    // Timeline Movement Initial
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
            } catch (error) {
                summary.errors.push({ line: index + 2, error: error.message });
            }
        }

        return summary;
    }

    private mapToOutput(asset: any): any {
        const netValue = this.calculateNetValue(Number(asset.price), asset.purchase_date);

        const statusLabels: Record<AssetStatus, string> = {
            [AssetStatus.GOOD]: 'BON ÉTAT',
            [AssetStatus.DAMAGED]: 'ABÎMÉ',
            [AssetStatus.REPAIR]: 'EN RÉPARATION',
            [AssetStatus.BROKEN]: 'HS (CASSÉ)',
            [AssetStatus.TO_REPLACE]: 'À REMPLACER',
        };

        const statusColors: Record<AssetStatus, string> = {
            [AssetStatus.GOOD]: 'emerald',
            [AssetStatus.DAMAGED]: 'amber',
            [AssetStatus.REPAIR]: 'sky',
            [AssetStatus.BROKEN]: 'rose',
            [AssetStatus.TO_REPLACE]: 'rose',
        };

        return {
            id: asset.id,
            tag_id: asset.tag_id,
            rfid: asset.tag_id,
            name: asset.name,
            category: asset.category.name,
            location: asset.location.name,
            status: statusColors[asset.status as AssetStatus] || 'sky',
            statusLabel: statusLabels[asset.status as AssetStatus] || asset.status,
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
            movements: (asset.movements || []).map((m: any) => ({
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

    private calculateNetValue(price: number, purchaseDate: Date): number {
        const now = new Date();
        const diffInMs = now.getTime() - purchaseDate.getTime();
        const yearsPassed = diffInMs / (1000 * 60 * 60 * 24 * 365.25);
        const netValue = price - (price / 5) * yearsPassed;
        return Math.max(0, netValue);
    }

    getTemplate(): Buffer {
        const xlsx = require('xlsx');
        const headers = ["ID (TAG RFID)", "Nom", "Catégorie", "Prix d'achat", "Localisation", "Marque", "Année d'achat"];
        const worksheet = xlsx.utils.aoa_to_sheet([headers]);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Template");
        return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
}
