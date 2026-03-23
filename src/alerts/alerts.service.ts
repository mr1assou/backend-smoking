import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AlertsService {
    constructor(private prisma: PrismaService) { }

    async create(createAlertDto: any, imageFile?: Express.Multer.File) {
        const { asset_id, comment, location_id, status } = createAlertDto;
        let { photo_url } = createAlertDto;
        const type = createAlertDto.type || status;

        // Vérification de Doublon (Crucial)
        if (asset_id) {
            const existingAlert = await this.prisma.alert.findFirst({
                where: {
                    asset_id,
                    status: 'OPEN',
                },
            });

            if (existingAlert) {
                // Si OUI : Renvoie une erreur 409 Conflict avec le message strict demandé
                throw new ConflictException('Un constat est déjà en cours pour cet actif');
            }
        }

        // --- GESTION PHOTO (Multer ou Base64) ---
        let finalPhotoUrl = photo_url || null;
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // 1. Fichier classique (multipart/form-data) via Multer
        if (imageFile) {
            const ext = path.extname(imageFile.originalname) || '.jpg';
            const filename = `alert-${uuidv4()}${ext}`;
            const filepath = path.join(uploadsDir, filename);
            fs.writeFileSync(filepath, imageFile.buffer);
            finalPhotoUrl = `/uploads/${filename}`;
        }
        // 2. Chaine Base64 reçue via JSON body
        else if (photo_url && photo_url.startsWith('data:image')) {
            const matches = photo_url.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                const buffer = Buffer.from(matches[2], 'base64');
                const filename = `alert-${uuidv4()}.${ext}`;
                const filepath = path.join(uploadsDir, filename);
                fs.writeFileSync(filepath, buffer);
                finalPhotoUrl = `/uploads/${filename}`;
            }
        }

        const alert = await this.prisma.alert.create({
            data: {
                asset_id,
                location_id,
                type,
                comment,
                photo_url: finalPhotoUrl,
                status: 'OPEN',
            },
            // Ajout des inclusions pour que le tableau de bord web ait immédiatement les données riches 
            include: {
                asset: {
                    include: {
                        category: true,
                        location: true,
                    },
                },
                location: true,
            },
        });

        console.log('Alerte créée avec succès:', alert.id);

        return alert;
    }

    async findAll() {
        return this.prisma.alert.findMany({
            where: {
                status: AlertStatus.OPEN,
            },
            include: {
                asset: {
                    include: {
                        category: true,
                        location: true,
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        });
    }

    // AJOUTER CETTE MÉTHODE : Mise à jour réelle Prisma
    async updateStatus(id: string, status: string) {
        const alert = await this.prisma.alert.findUnique({ where: { id } });
        if (!alert) throw new NotFoundException('Alerte non trouvée');

        return this.prisma.alert.update({
            where: { id },
            data: { status: status as AlertStatus },
        });
    }
}