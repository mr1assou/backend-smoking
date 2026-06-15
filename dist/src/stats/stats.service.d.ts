import { AttemptsRepository } from '../attempts/attempts.repository';
import { AttemptsService } from '../attempts/attempts.service';
import { UsersRepository } from '../users/users.repository';
import type { StatsAttemptsResponse, StatsOverviewResponse } from './types';
export declare class StatsService {
    private readonly usersRepository;
    private readonly attemptsRepository;
    private readonly attemptsService;
    constructor(usersRepository: UsersRepository, attemptsRepository: AttemptsRepository, attemptsService: AttemptsService);
    getOverview(userId: number): Promise<StatsOverviewResponse>;
    getAttempts(userId: number): Promise<StatsAttemptsResponse>;
}
