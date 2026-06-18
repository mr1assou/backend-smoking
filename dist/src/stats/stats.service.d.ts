import { AttemptsRepository } from '../attempts/attempts.repository';
import { AttemptsService } from '../attempts/attempts.service';
import { GoalsRepository } from '../goals/goals.repository';
import { UsersRepository } from '../users/users.repository';
import type { StatsAttemptsResponse, StatsGoalsResponse, StatsOverviewResponse } from './types';
export declare class StatsService {
    private readonly usersRepository;
    private readonly attemptsRepository;
    private readonly attemptsService;
    private readonly goalsRepository;
    constructor(usersRepository: UsersRepository, attemptsRepository: AttemptsRepository, attemptsService: AttemptsService, goalsRepository: GoalsRepository);
    getOverview(userId: number): Promise<StatsOverviewResponse>;
    getAttempts(userId: number): Promise<StatsAttemptsResponse>;
    getGoals(userId: number): Promise<StatsGoalsResponse>;
}
