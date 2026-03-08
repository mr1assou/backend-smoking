import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { AssetStatus, AlertType, AlertStatus } from '@prisma/client';
import { CreateMassScanDto } from './dto/create-mass-scan.dto';


@Injectable()
export class ScansService {
    constructor(private prisma: PrismaService) { }

    /**
     * Récupère les 20 derniers scans pour le Dashboard
     */
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

    /**
     * Enregistre un nouveau scan et gère la logique métier (Mouvement + Alerte)
     */
    async registerScan(dto: CreateScanDto, userIdFromToken: string) {
        if (!userIdFromToken) {
            throw new BadRequestException('L\'identifiant de l\'utilisateur est requis');
        }

        // 1. Vérification de l'actif et de la zone (indispensable après ton reset)
        const asset = await this.prisma.asset.findUnique({
            where: { id: dto.asset_id },
            include: { location: true },
        });

        if (!asset) throw new NotFoundException(`L'actif ${dto.asset_id} est introuvable`);

        const newLocation = await this.prisma.location.findUnique({
            where: { id: dto.location_id },
        });

        if (!newLocation) throw new NotFoundException(`Zone ${dto.location_id} introuvable`);

        const movementDetected = asset.location_id !== dto.location_id;

        // 2. Transaction Atomique
        return this.prisma.$transaction(async (tx) => {
            // A. Mise à jour de l'Actif
            await tx.asset.update({
                where: { id: dto.asset_id },
                data: { status: dto.status, location_id: dto.location_id },
            });

            // B. Création du Scan
            const scan = await tx.scan.create({
                data: {
                    asset_id: dto.asset_id,
                    user_id: userIdFromToken,
                    location_id: dto.location_id,
                    status: dto.status,
                }
            });

            // C. CRÉATION DE L'ALERTE AVEC CONSTAT (Photo + Commentaire)
            if (dto.status === "TO_REPLACE" || dto.status === "DAMAGED") {
                await tx.alert.create({
                    data: {
                        asset_id: asset.id,
                        type: dto.status === "TO_REPLACE" ? AlertType.REPLACE : AlertType.DAMAGED,
                        status: AlertStatus.OPEN,
                        comment: dto.comment,        // Enregistrement du texte
                        image_url: dto.image_data,   // Enregistrement du Base64
                    },
                });
            }

            // D. Historique
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

    // Dans la classe ScansService, ajoute cette fonction :
    async registerMassScan(dto: CreateMassScanDto, userId: string) {
        // 1. Vérification que la localisation envoyée existe en base
        const location = await this.prisma.location.findUnique({
            where: { id: dto.location_id }
        });
        if (!location) throw new NotFoundException('Zone de masse introuvable');

        const assets = await this.prisma.asset.findMany({
            where: { tag_id: { in: dto.tag_ids } },
        });

        if (assets.length === 0) throw new BadRequestException('Aucun tag valide détecté');

        return this.prisma.$transaction(async (tx) => {
            for (const asset of assets) {
                // Mise à jour vers la nouvelle localisation confirmée par le radar
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
}