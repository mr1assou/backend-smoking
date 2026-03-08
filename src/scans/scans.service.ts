import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScanDto } from './dto/create-scan.dto';

@Injectable()
export class ScansService {
    constructor(private prisma: PrismaService) { }

    async registerScan(dto: CreateScanDto, userIdFromToken?: string) {
        const finalUserId = userIdFromToken || dto.user_id;
        if (!finalUserId) {
            throw new Error('User ID is required for scanning');
        }

        const asset = await this.prisma.asset.findUnique({
            where: { id: dto.asset_id },
        });

        if (!asset) {
            throw new NotFoundException(`Asset ${dto.asset_id} not found`);
        }

        const oldLocationId = asset.location_id;

        return this.prisma.$transaction(async (tx) => {
            const updatedAsset = await tx.asset.update({
                where: { id: dto.asset_id },
                data: {
                    status: dto.status,
                    location_id: dto.location_id,
                },
            });

            const scan = await tx.scan.create({
                data: {
                    asset_id: dto.asset_id,
                    user_id: finalUserId,
                    location_id: dto.location_id,
                    status: dto.status,
                    scanned_at: new Date(),
                },
                include: {
                    asset: {
                        include: {
                            category: true,
                            location: true,
                        }
                    }
                }
            });

            await tx.assetHistory.create({
                data: {
                    asset_id: dto.asset_id,
                    user_id: finalUserId,
                    action: `SCAN [STATUS: ${dto.status}] [LOCATION: ${dto.location_id}]`,
                    timestamp: new Date(),
                },
            });

            if (oldLocationId !== dto.location_id) {
                await tx.assetMovement.create({
                    data: {
                        asset_id: dto.asset_id,
                        from_location_id: oldLocationId,
                        to_location_id: dto.location_id,
                        moved_at: new Date(),
                    },
                });
            }

            return scan;
        });
    }
}
