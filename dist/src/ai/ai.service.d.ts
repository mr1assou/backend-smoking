import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class AiService {
    private prisma;
    private config;
    private genAI;
    private model;
    constructor(prisma: PrismaService, config: ConfigService);
    getReplacementSuggestions(assetId: string): Promise<any>;
}
