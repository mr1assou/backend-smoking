import type { Request } from 'express';
import { CreateSlipEventDto } from './dto/create-slip-event.dto';
import { SlipEventsService } from './slip-events.service';
export declare class SlipEventsController {
    private readonly slipEventsService;
    constructor(slipEventsService: SlipEventsService);
    create(req: Request & {
        user: {
            userId: number;
        };
    }, dto: CreateSlipEventDto): Promise<{
        slipEventId: number;
        outcome: string;
        cigarettesCount: number | undefined;
        streakStart: string;
        quitDate: string;
        previousStreakStart: string;
        closedAttemptId: number | undefined;
        newAttemptId: number | undefined;
        currentAttemptNumber: number;
    }>;
    remove(req: Request & {
        user: {
            userId: number;
        };
    }, id: number): Promise<{
        streakStart: string | null;
        quitDate: string | null;
        currentAttemptNumber: number | undefined;
    }>;
}
