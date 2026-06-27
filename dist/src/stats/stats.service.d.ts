import { AttemptsRepository } from '../attempts/attempts.repository';
import { AttemptsService } from '../attempts/attempts.service';
import { FreedomPointsRepository } from '../freedom-points/freedom-points.repository';
import { FreedomPointsService } from '../freedom-points/freedom-points.service';
import { GoalsRepository } from '../goals/goals.repository';
import { UsersRepository } from '../users/users.repository';
import type { StatsAttemptsResponse, StatsFreedomPointsResponse, StatsGoalsResponse, StatsOverviewResponse } from './types';
export declare class StatsService {
    private readonly usersRepository;
    private readonly attemptsRepository;
    private readonly attemptsService;
    private readonly goalsRepository;
    private readonly freedomPointsService;
    private readonly freedomPointsRepository;
    constructor(usersRepository: UsersRepository, attemptsRepository: AttemptsRepository, attemptsService: AttemptsService, goalsRepository: GoalsRepository, freedomPointsService: FreedomPointsService, freedomPointsRepository: FreedomPointsRepository);
    getOverview(userId: number): Promise<StatsOverviewResponse>;
    getAttempts(userId: number): Promise<StatsAttemptsResponse>;
    getGoals(userId: number): Promise<StatsGoalsResponse>;
    getFreedomPoints(userId: number): Promise<StatsFreedomPointsResponse>;
}
