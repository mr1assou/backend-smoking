import { PrismaService } from '../prisma/prisma.service';
export declare class AssetsService {
    private prisma;
    constructor(prisma: PrismaService);
    findByTag(tagId: string): Promise<any>;
    findOne(id: string): Promise<any>;
    findAll(): Promise<any[]>;
    resetAll(): Promise<{
        message: string;
    }>;
    create(dto: any): Promise<any>;
    importAssets(fileBuffer: Buffer): Promise<{
        success: number;
        errors: any[];
        total: any;
    }>;
    private mapToOutput;
    private calculateNetValue;
    getTemplate(): Buffer;
}
