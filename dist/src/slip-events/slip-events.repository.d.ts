import { SlipEvent } from '@prisma/client';
import { EconomicsSegmentsRepository } from '../attempts/economics-segments.repository';
import { AttemptsService } from '../attempts/attempts.service';
import { GoalsRepository } from '../goals/goals.repository';
import { PrismaService } from '../prisma/prisma.service';
import type { SlipOutcome } from './types/slip-outcome';
export type CreateSlipEventData = {
    userId: number;
    outcome: SlipOutcome;
    cigarettesCount?: number;
    previousStreakStart: Date;
    previousQuitDate: Date;
    cigarettesPerDay: number;
    cigarettesPerPack: number;
    packPrice: string | null;
};
export type SlipCreateResult = {
    event: SlipEvent;
    streakStart: Date;
    quitDate: Date;
    currentAttemptNumber: number;
};
export declare class SlipEventsRepository {
    private readonly prisma;
    private readonly attemptsService;
    private readonly economicsSegmentsRepository;
    private readonly goalsRepository;
    constructor(prisma: PrismaService, attemptsService: AttemptsService, economicsSegmentsRepository: EconomicsSegmentsRepository, goalsRepository: GoalsRepository);
    findOwnedById(userId: number, slipEventId: number): Promise<SlipEvent | null>;
    sumSlipCigarettesSince(userId: number, since: Date): Promise<number>;
    createWithAttemptRotation(data: CreateSlipEventData): Promise<SlipCreateResult>;
    deleteOwnedAndRestoreAttempt(userId: number, slipEventId: number, event: SlipEvent): Promise<{
        streakStart: Date | null;
        quitDate: Date | null;
        currentAttemptNumber: number | null;
    }>;
}
