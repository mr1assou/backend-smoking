import { PrismaService } from '../prisma/prisma.service';
export declare class StatsRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    countSlipsSince(userId: number, since: Date): Promise<number>;
    countAllSlips(userId: number): Promise<number>;
}
