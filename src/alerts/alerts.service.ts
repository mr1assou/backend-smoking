import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertStatus } from '@prisma/client';

@Injectable()
export class AlertsService {
    constructor(private prisma: PrismaService) { }

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