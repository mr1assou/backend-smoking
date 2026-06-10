import { QuitAttempt } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AttemptImpactSnapshot } from '../stats/attempt-impact';
export type CloseAttemptData = AttemptImpactSnapshot & {
    endedAt: Date;
    endOutcome: string;
};
export declare class AttemptsRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findActive(userId: number): Promise<QuitAttempt | null>;
    findById(userId: number, attemptId: number): Promise<QuitAttempt | null>;
    listCompleted(userId: number): Promise<QuitAttempt[]>;
    listAllForUser(userId: number): Promise<QuitAttempt[]>;
    countForUser(userId: number): Promise<number>;
    createFirst(userId: number, startedAt: Date): Promise<QuitAttempt>;
    createNext(userId: number, attemptNumber: number, startedAt: Date): Promise<QuitAttempt>;
    close(attemptId: number, data: CloseAttemptData): Promise<QuitAttempt>;
    deleteById(attemptId: number): Promise<void>;
    reopen(attemptId: number): Promise<QuitAttempt>;
}
