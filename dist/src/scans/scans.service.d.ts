import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { CreateMassScanDto } from './dto/create-mass-scan.dto';
export declare class ScansService {
    private prisma;
    private filesService;
    constructor(prisma: PrismaService, filesService: FilesService);
    findRecent(): Promise<({
        user: {
            id: string;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        location: {
            id: string;
            name: string;
            parent_id: string | null;
            type: import(".prisma/client").$Enums.LocationType;
        };
        asset: {
            category: {
                id: string;
                name: string;
            };
        } & {
            id: string;
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
            location_id: string;
            status: import(".prisma/client").$Enums.AssetStatus;
        };
    } & {
        id: string;
        location_id: string;
        status: import(".prisma/client").$Enums.AssetStatus;
        scanned_at: Date;
        asset_id: string;
        user_id: string;
    })[]>;
    registerScan(dto: CreateScanDto, userIdFromToken: string): Promise<{
        movementDetected: boolean;
        photoUrl: string | undefined;
        id: string;
        location_id: string;
        status: import(".prisma/client").$Enums.AssetStatus;
        scanned_at: Date;
        asset_id: string;
        user_id: string;
    }>;
    registerMassScan(dto: CreateMassScanDto, userId: string): Promise<{
        count: number;
        message: string;
    }>;
}
