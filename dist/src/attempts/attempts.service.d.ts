import { QuitAttempt } from '@prisma/client';
import { EconomicsSegmentsRepository, habitEconomicsFromUser } from './economics-segments.repository';
import { AttemptsRepository } from './attempts.repository';
import { type AttemptEconomics, type AttemptImpactSnapshot } from '../stats/lib/attempt-impact';
export type AttemptSummary = {
    attemptId: number;
    attemptNumber: number;
    startedAt: string;
    endedAt: string | null;
    endOutcome: string | null;
    durationSeconds: number;
    cigarettesAvoided: number;
    moneySaved: number;
    lifeMinutesGained: number;
    slipCigarettesSmoked: number;
};
export declare class AttemptsService {
    private readonly attemptsRepository;
    private readonly economicsSegmentsRepository;
    constructor(attemptsRepository: AttemptsRepository, economicsSegmentsRepository: EconomicsSegmentsRepository);
    ensureFirstAttempt(userId: number, startedAt: Date, economics?: ReturnType<typeof habitEconomicsFromUser>): Promise<QuitAttempt>;
    seedEconomicsForAttempt(attemptId: number, effectiveFrom: Date, economics: ReturnType<typeof habitEconomicsFromUser>): Promise<void>;
    buildEconomics(user: {
        cigarettesPerDay: number | null;
        cigarettesPerPack: number | null;
        packPrice: string | null;
    }): AttemptEconomics;
    computeSnapshot(economics: AttemptEconomics, startedAt: Date, endedAt: Date, slipCigarettesSmoked: number): AttemptImpactSnapshot;
    computeSegmentedSnapshot(userId: number, attempt: QuitAttempt, timelineStart: Date, endedAt: Date, pendingSlip?: {
        loggedAt: Date;
        cigarettesCount: number;
    }): Promise<AttemptImpactSnapshot>;
    getActiveAttempt(userId: number): Promise<QuitAttempt | null>;
    listCompletedAttempts(userId: number): Promise<AttemptSummary[]>;
    toSummary(row: QuitAttempt): AttemptSummary;
}
