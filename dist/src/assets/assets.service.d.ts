import { PrismaService } from '../prisma/prisma.service';
export declare class AssetsService {
    private prisma;
    constructor(prisma: PrismaService);
    findByTag(tagId: string): Promise<any>;
    findOne(id: string): Promise<any>;
    findAll(): Promise<any[]>;
    findOrphans(query?: string): Promise<any[]>;
    findUntagged(): Promise<any[]>;
    enrollTag(assetId: string, tagId: string, locationId?: string): Promise<any>;
    updateAsset(id: string, dto: any): Promise<any>;
    removeAsset(id: string): Promise<any>;
    resetAll(): Promise<{
        message: string;
    }>;
    create(dto: any): Promise<any>;
    importAssets(fileBuffer: Buffer): Promise<{
        success: number;
        skipped_no_name: number;
        errors: any[];
        total: any;
    }>;
    private mapStatus;
    private mapToOutput;
    private calculateNetValue;
    getCategories(): Promise<{
        id: string;
        name: string;
    }[]>;
    getTemplate(): Buffer;
}
