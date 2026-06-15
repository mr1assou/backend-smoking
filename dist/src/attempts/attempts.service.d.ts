import { QuitAttempt } from '@prisma/client';
import { type AttemptEconomics } from '../stats/lib/attempt-impact';
import { AttemptsRepository } from './attempts.repository';
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
    constructor(attemptsRepository: AttemptsRepository);
    ensureFirstAttempt(userId: number, startedAt: Date): Promise<QuitAttempt>;
    buildEconomics(user: {
        cigarettesPerDay: number | null;
        cigarettesPerPack: number | null;
        packPrice: string | null;
    }): AttemptEconomics;
    computeSnapshot(economics: AttemptEconomics, startedAt: Date, endedAt: Date, slipCigarettesSmoked: number): import("../stats/lib/attempt-impact").AttemptImpactSnapshot;
    getActiveAttempt(userId: number): Promise<QuitAttempt | null>;
    listCompletedAttempts(userId: number): Promise<AttemptSummary[]>;
    toSummary(row: QuitAttempt): AttemptSummary;
}
