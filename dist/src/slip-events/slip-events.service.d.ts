import { UsersRepository } from '../users/users.repository';
import { CreateSlipEventDto } from './dto/create-slip-event.dto';
import { SlipEventsRepository } from './slip-events.repository';
export declare class SlipEventsService {
    private readonly slipEventsRepository;
    private readonly usersRepository;
    constructor(slipEventsRepository: SlipEventsRepository, usersRepository: UsersRepository);
    create(userId: number, dto: CreateSlipEventDto): Promise<{
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
    remove(userId: number, slipEventId: number): Promise<{
        streakStart: string | null;
        quitDate: string | null;
        currentAttemptNumber: number | undefined;
    }>;
}
