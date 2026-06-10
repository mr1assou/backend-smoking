import { Injectable, NotFoundException } from '@nestjs/common';
import { toUtcIso, utcInstantNow } from '../common/utc-instant';
import { UsersRepository } from '../users/users.repository';
import { CreateSlipEventDto } from './dto/create-slip-event.dto';
import { resolveSlipCigarettesCount } from './slip-cigarette-count';
import { SlipEventsRepository } from './slip-events.repository';

@Injectable()
export class SlipEventsService {
  constructor(
    private readonly slipEventsRepository: SlipEventsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async create(userId: number, dto: CreateSlipEventDto) {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const fallback = utcInstantNow();
    const previousStreakStart = user.streakStart ?? user.quitDate ?? fallback;
    const previousQuitDate = user.quitDate ?? previousStreakStart;

    const cigarettesCount = resolveSlipCigarettesCount(
      dto.outcome,
      dto.cigarettesCount,
    );

    const { event, streakStart, quitDate, currentAttemptNumber } =
      await this.slipEventsRepository.createWithAttemptRotation({
        userId,
        outcome: dto.outcome,
        cigarettesCount,
        previousStreakStart,
        previousQuitDate,
        cigarettesPerDay: user.cigarettesPerDay ?? 0,
        cigarettesPerPack: user.cigarettesPerPack ?? 20,
        packPrice: user.packPrice,
      });

    return {
      slipEventId: event.slip_event_id,
      outcome: event.outcome,
      cigarettesCount: event.cigarettesCount ?? undefined,
      streakStart: toUtcIso(streakStart),
      quitDate: toUtcIso(quitDate),
      previousStreakStart: toUtcIso(previousStreakStart),
      closedAttemptId: event.closedAttemptId ?? undefined,
      newAttemptId: event.newAttemptId ?? undefined,
      currentAttemptNumber,
    };
  }

  async remove(userId: number, slipEventId: number) {
    const event = await this.slipEventsRepository.findOwnedById(userId, slipEventId);
    if (!event) throw new NotFoundException('Slip event not found');

    const restored = await this.slipEventsRepository.deleteOwnedAndRestoreAttempt(
      userId,
      slipEventId,
      event,
    );

    return {
      streakStart: restored.streakStart ? toUtcIso(restored.streakStart) : null,
      quitDate: restored.quitDate ? toUtcIso(restored.quitDate) : null,
      currentAttemptNumber: restored.currentAttemptNumber ?? undefined,
    };
  }
}
