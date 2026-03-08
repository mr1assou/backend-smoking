import { PrismaService } from '../prisma/prisma.service';
import { AssetOutputDto } from './dto/asset-output.dto';
export declare class AssetsService {
    private prisma;
    constructor(prisma: PrismaService);
    findByTag(tagId: string): Promise<AssetOutputDto>;
    private mapToOutput;
    calculateNetValue(price: number, purchaseDate: Date): number;
}
