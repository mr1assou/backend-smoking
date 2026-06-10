import { PrismaService } from '../prisma/prisma.service';
export declare class StatsRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    countSlipsSince(userId: number, since: Date): Promise<number>;
    countAllSlips(userId: number): Promise<number>;
    listSlipEvents(userId: number): import("@prisma/client").Prisma.PrismaPromise<{
        cigarettesCount: number | null;
        slip_event_id: number;
        outcome: string;
        loggedAt: Date;
        closedAttempt: {
            attemptNumber: number;
            startedAt: Date;
        } | null;
    }[]>;
}
