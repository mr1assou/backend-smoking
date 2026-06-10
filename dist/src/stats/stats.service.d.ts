import { AttemptsRepository } from '../attempts/attempts.repository';
import { AttemptsService } from '../attempts/attempts.service';
import { UsersRepository } from '../users/users.repository';
import { StatsRepository } from './stats.repository';
export type StatsImpact = {
    durationSeconds: number;
    cigarettesAvoided: number;
    moneySaved: number;
    lifeMinutesGained: number;
    slipCigarettesSmoked: number;
};
export type CurrentStats = StatsImpact & {
    attemptNumber: number;
    startedAt: string;
    streakStart: string;
    slipCount: number;
};
export type LifetimeStats = StatsImpact & {
    totalAttempts: number;
    completedAttempts: number;
    slipCount: number;
};
export type AttemptStatsRow = StatsImpact & {
    attemptNumber: number;
    startedAt: string;
    endedAt: string | null;
    endOutcome: string | null;
    isActive: boolean;
};
export type SlipStatsRow = {
    slipEventId: number;
    outcome: string;
    cigarettesCount: number;
    loggedAt: string;
    attemptNumber: number | null;
    attemptStartedAt: string | null;
};
export type StatsEconomics = {
    cigarettesPerDay: number;
    cigarettesPerPack: number;
    packCost: number;
};
export type UserStatsResponse = {
    currency: string;
    timezone: string;
    economics: StatsEconomics;
    current: CurrentStats | null;
    lifetime: LifetimeStats;
    attempts: AttemptStatsRow[];
    slips: SlipStatsRow[];
};
export declare class StatsService {
    private readonly usersRepository;
    private readonly attemptsRepository;
    private readonly attemptsService;
    private readonly statsRepository;
    constructor(usersRepository: UsersRepository, attemptsRepository: AttemptsRepository, attemptsService: AttemptsService, statsRepository: StatsRepository);
    getUserStats(userId: number): Promise<UserStatsResponse>;
    private toSlipStatsRow;
    private buildAttemptsList;
}
