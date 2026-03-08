import { PrismaService } from '../prisma/prisma.service';
import { CreateScanDto } from './dto/create-scan.dto';
export declare class ScansService {
    private prisma;
    constructor(prisma: PrismaService);
    registerScan(dto: CreateScanDto, userIdFromToken?: string): Promise<{
        asset: {
            location: {
                id: string;
                name: string;
                parent_id: string | null;
                type: import(".prisma/client").$Enums.LocationType;
            };
            category: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.AssetStatus;
            location_id: string;
            name: string;
            tag_id: string;
            category_id: string;
            brand: string;
            model: string;
            supplier_id: string;
            purchase_date: Date;
            price: import("@prisma/client/runtime/library").Decimal;
            warranty_end: Date | null;
            created_at: Date;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.AssetStatus;
        scanned_at: Date;
        asset_id: string;
        user_id: string;
        location_id: string;
    }>;
}
