import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { AssetStatus, AlertType, AlertStatus } from '@prisma/client';
import { CreateMassScanDto } from './dto/create-mass-scan.dto';


@Injectable()
export class ScansService {
    constructor(
        private prisma: PrismaService,
        private filesService: FilesService
    ) { }

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

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!dto.location_id || !uuidRegex.test(dto.location_id)) {
            throw new BadRequestException("Erreur de synchronisation : Le location_id fourni est manquant ou invalide.");
        }

        // 1. Vérification de l'actif
        const asset = await this.prisma.asset.findUnique({
            where: { id: dto.asset_id },
            include: { location: true },
        });

        if (!asset) {
            console.error(`[Scan] Asset non trouvé: ${dto.asset_id}`);
            throw new NotFoundException(`L'objet avec l'ID ${dto.asset_id} est introuvable dans la base de données.`);
        }

        // Vérification de la cohérence Tag vs ID
        if (asset.tag_id !== dto.tag_id) {
            console.error(`[Scan] Mismatch Tag! Attendu: ${asset.tag_id}, Reçu: ${dto.tag_id}`);
            throw new BadRequestException(`Le tag RFID (${dto.tag_id}) ne correspond pas à l'asset sélectionné.`);
        }

        const newLocation = await this.prisma.location.findUnique({
            where: { id: dto.location_id },
        });

        if (!newLocation) throw new NotFoundException(`Zone ${dto.location_id} introuvable`);

        // Gestion de l'image si présente
        let photoUrl: string | undefined;
        if (dto.image_data) {
            photoUrl = await this.filesService.saveBase64Image(dto.image_data);
        }

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

            // LOG DU MOUVEMENT
            if (movementDetected) {
                await tx.assetMovement.create({
                    data: {
                        asset_id: dto.asset_id,
                        from_location_id: asset.location_id,
                        to_location_id: dto.location_id,
                        user_id: userIdFromToken,
                        scan_id: scan.id,
                    }
                });
            }

            // C. CRÉATION DE L'ALERTE AVEC CONSTAT (Photo + Commentaire)
            if (dto.status === "TO_REPLACE" || dto.status === "DAMAGED") {
                await tx.alert.create({
                    data: {
                        asset_id: asset.id,
                        location_id: dto.location_id,
                        type: dto.status === "TO_REPLACE" ? AlertType.REPLACE : AlertType.DAMAGED,
                        status: AlertStatus.OPEN,
                        comment: dto.comment,
                        photo_url: photoUrl, // Utilisation de l'URL retournée par FilesService
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

            return { ...scan, movementDetected, photoUrl };
        });
    }

    // Dans la classe ScansService, ajoute cette fonction :
    async registerMassScan(dto: CreateMassScanDto, userId: string) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!dto.location_id || !uuidRegex.test(dto.location_id)) {
            throw new BadRequestException("Erreur de synchronisation : Le location_id de masse fourni est manquant ou invalide.");
        }
        console.log(`[MassScan] Inventaire de ${dto.tag_ids.length} tags dans la zone ${dto.location_id}`);

        // 1. Vérification que la localisation envoyée existe en base
        const location = await this.prisma.location.findUnique({
            where: { id: dto.location_id },
        });
        if (!location) {
            throw new NotFoundException(`La zone d'inventaire (${dto.location_id}) est introuvable.`);
        }

        const assets = await this.prisma.asset.findMany({
            where: { tag_id: { in: dto.tag_ids } },
        });

        if (assets.length === 0) throw new BadRequestException('Aucun tag valide détecté');

        return this.prisma.$transaction(async (tx) => {
            for (const asset of assets) {
                const isMoved = asset.location_id !== dto.location_id;

                // Mise à jour de l'actif
                await tx.asset.update({
                    where: { id: asset.id },
                    data: { location_id: dto.location_id, status: dto.status }
                });

                // Création du Scan
                const scan = await tx.scan.create({
                    data: {
                        asset_id: asset.id,
                        user_id: userId,
                        location_id: dto.location_id,
                        status: dto.status,
                    }
                });

                // Recording movement if changed
                if (isMoved) {
                    await tx.assetMovement.create({
                        data: {
                            asset_id: asset.id,
                            from_location_id: asset.location_id,
                            to_location_id: dto.location_id,
                            user_id: userId,
                            scan_id: scan.id,
                        }
                    });
                }

                // Historique
                await tx.assetHistory.create({
                    data: {
                        asset_id: asset.id,
                        user_id: userId,
                        action: `Audit de masse effectué (Zone: ${location.name})`,
                    },
                });
            }
            return { count: assets.length, message: "Inventaire de masse réussi" };
        });
    }
}