import { Injectable } from '@nestjs/common';
import { SlipEvent } from '@prisma/client';
import {
  EconomicsSegmentsRepository,
  habitEconomicsFromUser,
} from '../attempts/economics-segments.repository';
import { AttemptsService } from '../attempts/attempts.service';
import { utcInstantNow } from '../common/utc-instant';
import { GoalsRepository } from '../goals/goals.repository';
import { PrismaService } from '../prisma/prisma.service';
import { resolveSlipCigarettesCount } from './lib';
import type { SlipOutcome } from './types/slip-outcome';

export type CreateSlipEventData = {
  userId: number;
  outcome: SlipOutcome;
  cigarettesCount?: number;
  previousStreakStart: Date;
  previousQuitDate: Date;
  cigarettesPerDay: number;
  cigarettesPerPack: number;
  packPrice: string | null;
};

export type SlipCreateResult = {
  event: SlipEvent;
  streakStart: Date;
  quitDate: Date;
  currentAttemptNumber: number;
};

@Injectable()
export class SlipEventsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attemptsService: AttemptsService,
    private readonly economicsSegmentsRepository: EconomicsSegmentsRepository,
    private readonly goalsRepository: GoalsRepository,
  ) {}

  findOwnedById(
    userId: number,
    slipEventId: number,
  ): Promise<SlipEvent | null> {
    return this.prisma.slipEvent.findFirst({
      where: { slip_event_id: slipEventId, user_id: userId },
    });
  }

  sumSlipCigarettesSince(userId: number, since: Date): Promise<number> {
    return this.prisma.slipEvent
      .aggregate({
        where: {
          user_id: userId,
          loggedAt: { gte: since },
          cigarettesCount: { not: null },
        },
        _sum: { cigarettesCount: true },
      })
      .then((result) => result._sum.cigarettesCount ?? 0);
  }

  async createWithAttemptRotation(
    data: CreateSlipEventData,
  ): Promise<SlipCreateResult> {
    const now = utcInstantNow();
    const cigarettesCount = resolveSlipCigarettesCount(
      data.outcome,
      data.cigarettesCount,
    );
    const slipThisEvent = cigarettesCount ?? 0;
    const habitEconomics = habitEconomicsFromUser({
      cigarettesPerDay: data.cigarettesPerDay,
      cigarettesPerPack: data.cigarettesPerPack,
      packPrice: data.packPrice,
    });

    let activeAttempt = await this.prisma.quitAttempt.findFirst({
      where: { user_id: data.userId, endedAt: null },
      orderBy: { attemptNumber: 'desc' },
    });

    if (!activeAttempt) {
      activeAttempt = await this.prisma.quitAttempt.create({
        data: {
          user_id: data.userId,
          attemptNumber: 1,
          startedAt: data.previousQuitDate,
        },
      });
      await this.economicsSegmentsRepository.seedInitial(
        activeAttempt.attempt_id,
        data.previousQuitDate,
        habitEconomics,
      );
    }

    const snapshot = await this.attemptsService.computeSegmentedSnapshot(
      data.userId,
      activeAttempt,
      data.previousStreakStart,
      now,
      { loggedAt: now, cigarettesCount: slipThisEvent },
    );

    return this.prisma.$transaction(async (tx) => {
      const attempt = await tx.quitAttempt.findFirstOrThrow({
        where: { attempt_id: activeAttempt!.attempt_id },
      });

      const closedAttempt = await tx.quitAttempt.update({
        where: { attempt_id: attempt.attempt_id },
        data: {
          endedAt: now,
          endOutcome: data.outcome,
          durationSeconds: snapshot.durationSeconds,
          cigarettesAvoided: snapshot.cigarettesAvoided,
          moneySaved: snapshot.moneySaved,
          lifeMinutesGained: snapshot.lifeMinutesGained,
          slipCigarettesSmoked: snapshot.slipCigarettesSmoked,
        },
      });

      const newAttempt = await tx.quitAttempt.create({
        data: {
          user_id: data.userId,
          attemptNumber: attempt.attemptNumber + 1,
          startedAt: now,
        },
      });

      await this.economicsSegmentsRepository.seedInitial(
        newAttempt.attempt_id,
        now,
        habitEconomics,
        tx,
      );

      const event = await tx.slipEvent.create({
        data: {
          user_id: data.userId,
          outcome: data.outcome,
          cigarettesCount: cigarettesCount ?? null,
          previousStreakStart: data.previousStreakStart,
          previousQuitDate: data.previousQuitDate,
          closedAttemptId: closedAttempt.attempt_id,
          newAttemptId: newAttempt.attempt_id,
        },
      });

      await this.goalsRepository.failActiveGoalsForAttempt(
        tx,
        closedAttempt.attempt_id,
        event.slip_event_id,
      );

      await tx.user.update({
        where: { user_id: data.userId },
        data: { streakStart: now, quitDate: now },
      });

      return {
        event,
        streakStart: now,
        quitDate: now,
        currentAttemptNumber: newAttempt.attemptNumber,
      };
    });
  }

  deleteOwnedAndRestoreAttempt(
    userId: number,
    slipEventId: number,
    event: SlipEvent,
  ): Promise<{
    streakStart: Date | null;
    quitDate: Date | null;
    currentAttemptNumber: number | null;
  }> {
    return this.prisma.$transaction(async (tx) => {
      let currentAttemptNumber: number | null = null;

      if (event.closedAttemptId && event.newAttemptId) {
        const reopened = await tx.quitAttempt.update({
          where: { attempt_id: event.closedAttemptId },
          data: {
            endedAt: null,
            endOutcome: null,
            durationSeconds: 0,
            cigarettesAvoided: 0,
            moneySaved: 0,
            lifeMinutesGained: 0,
            slipCigarettesSmoked: 0,
          },
        });

        await tx.quitAttempt.delete({
          where: { attempt_id: event.newAttemptId },
        });

        currentAttemptNumber = reopened.attemptNumber;

        await this.goalsRepository.restoreGoalsFailedBySlip(
          tx,
          slipEventId,
        );

        await tx.user.update({
          where: { user_id: userId },
          data: {
            streakStart: event.previousStreakStart,
            quitDate: event.previousQuitDate,
          },
        });
      } else if (event.previousStreakStart) {
        await tx.user.update({
          where: { user_id: userId },
          data: { streakStart: event.previousStreakStart },
        });
      }

      await tx.slipEvent.delete({ where: { slip_event_id: slipEventId } });

      return {
        streakStart: event.previousStreakStart,
        quitDate: event.previousQuitDate,
        currentAttemptNumber,
      };
    });
  }
}
