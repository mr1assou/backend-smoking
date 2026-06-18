import { Injectable } from '@nestjs/common';
import { SlipEvent } from '@prisma/client';
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

  createWithAttemptRotation(
    data: CreateSlipEventData,
  ): Promise<SlipCreateResult> {
    const now = utcInstantNow();
    const cigarettesCount = resolveSlipCigarettesCount(
      data.outcome,
      data.cigarettesCount,
    );
    const economics = this.attemptsService.buildEconomics({
      cigarettesPerDay: data.cigarettesPerDay,
      cigarettesPerPack: data.cigarettesPerPack,
      packPrice: data.packPrice,
    });

    return this.prisma.$transaction(async (tx) => {
      let activeAttempt = await tx.quitAttempt.findFirst({
        where: { user_id: data.userId, endedAt: null },
        orderBy: { attemptNumber: 'desc' },
      });

      if (!activeAttempt) {
        activeAttempt = await tx.quitAttempt.create({
          data: {
            user_id: data.userId,
            attemptNumber: 1,
            startedAt: data.previousQuitDate,
          },
        });
      }

      const priorSlipSum = await tx.slipEvent.aggregate({
        where: {
          user_id: data.userId,
          loggedAt: { gte: activeAttempt.startedAt },
          cigarettesCount: { not: null },
        },
        _sum: { cigarettesCount: true },
      });
      const slipThisEvent = cigarettesCount ?? 0;
      const totalSlipCigarettes =
        (priorSlipSum._sum.cigarettesCount ?? 0) + slipThisEvent;

      const snapshot = this.attemptsService.computeSnapshot(
        economics,
        activeAttempt.startedAt,
        now,
        totalSlipCigarettes,
      );

      const closedAttempt = await tx.quitAttempt.update({
        where: { attempt_id: activeAttempt.attempt_id },
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
          attemptNumber: activeAttempt.attemptNumber + 1,
          startedAt: now,
        },
      });

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
