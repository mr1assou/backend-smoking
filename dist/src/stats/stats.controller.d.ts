import type { Request } from 'express';
import { StatsService } from './stats.service';
export declare class StatsController {
    private readonly statsService;
    constructor(statsService: StatsService);
    getOverview(req: Request & {
        user: {
            userId: number;
        };
    }): Promise<import("./types").StatsOverviewResponse>;
    getAttempts(req: Request & {
        user: {
            userId: number;
        };
    }): Promise<import("./types").StatsAttemptsResponse>;
    getGoals(req: Request & {
        user: {
            userId: number;
        };
    }): Promise<import("./types").StatsGoalsResponse>;
}
