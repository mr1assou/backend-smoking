import type { Request } from 'express';
import { StatsService } from './stats.service';
export declare class StatsController {
    private readonly statsService;
    constructor(statsService: StatsService);
    getStats(req: Request & {
        user: {
            userId: number;
        };
    }): Promise<import("./stats.service").UserStatsResponse>;
}
