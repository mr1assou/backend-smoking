import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Asset, AssetStatus } from '@prisma/client';
import { AssetOutputDto } from './dto/asset-output.dto';

@Injectable()
export class AssetsService {
    constructor(private prisma: PrismaService) { }

    async findByTag(tagId: string): Promise<AssetOutputDto> {
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
            throw new NotFoundException(`Asset with tag ${tagId} not found`);
        }

        return this.mapToOutput(asset);
    }

    async findAll(): Promise<AssetOutputDto[]> {
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

    async create(dto: any): Promise<AssetOutputDto> {
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

    private mapToOutput(asset: any): AssetOutputDto {
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

    calculateNetValue(price: number, purchaseDate: Date): number {
        const now = new Date();
        const diffInMs = now.getTime() - purchaseDate.getTime();
        const yearsPassed = diffInMs / (1000 * 60 * 60 * 24 * 365.25);

        const usefulLife = 5; // standard amortization for hotel assets
        const depreciation = (price / usefulLife) * yearsPassed;
        const netValue = price - depreciation;

        return Math.max(0, netValue);
    }
}
