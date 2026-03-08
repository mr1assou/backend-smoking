import { PrismaService } from '../prisma/prisma.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { CreateMassScanDto } from './dto/create-mass-scan.dto';
export declare class ScansService {
    private prisma;
    constructor(prisma: PrismaService);
    findRecent(): Promise<({
        asset: {
            category: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            location_id: string;
            status: import(".prisma/client").$Enums.AssetStatus;
            name: string;
            created_at: Date;
            tag_id: string;
            category_id: string;
            brand: string;
            model: string;
            supplier_id: string;
            purchase_date: Date;
            price: import("@prisma/client/runtime/library").Decimal;
            warranty_end: Date | null;
        };
        user: {
            id: string;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        location: {
            id: string;
            name: string;
            parent_id: string | null;
            type: import(".prisma/client").$Enums.LocationType;
        };
    } & {
        id: string;
        asset_id: string;
        user_id: string;
        location_id: string;
        status: import(".prisma/client").$Enums.AssetStatus;
        scanned_at: Date;
    })[]>;
    registerScan(dto: CreateScanDto, userIdFromToken: string): Promise<{
        movementDetected: boolean;
        id: string;
        asset_id: string;
        user_id: string;
        location_id: string;
        status: import(".prisma/client").$Enums.AssetStatus;
        scanned_at: Date;
    }>;
    registerMassScan(dto: CreateMassScanDto, userId: string): Promise<{
        count: number;
        message: string;
    }>;
}
