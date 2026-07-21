import { Injectable } from '@nestjs/common';
import { QuitAttempt } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AttemptImpactSnapshot } from '../stats/lib/attempt-impact';

export type CloseAttemptData = AttemptImpactSnapshot & {
  endedAt: Date;
  endOutcome: string;
};

export type SlipEventSlice = {
  loggedAt: Date;
  cigarettesCount: number | null;
};

@Injectable()
export class AttemptsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActive(userId: number): Promise<QuitAttempt | null> {
    return this.prisma.quitAttempt.findFirst({
      where: { user_id: userId, endedAt: null },
      orderBy: { attemptNumber: 'desc' },
    });
  }

  findById(userId: number, attemptId: number): Promise<QuitAttempt | null> {
    return this.prisma.quitAttempt.findFirst({
      where: { attempt_id: attemptId, user_id: userId },
    });
  }

  listCompleted(userId: number): Promise<QuitAttempt[]> {
    return this.prisma.quitAttempt.findMany({
      where: { user_id: userId, endedAt: { not: null } },
      orderBy: { attemptNumber: 'desc' },
    });
  }

  listAllForUser(userId: number): Promise<QuitAttempt[]> {
    return this.prisma.quitAttempt.findMany({
      where: { user_id: userId },
      orderBy: { attemptNumber: 'desc' },
    });
  }

  countForUser(userId: number): Promise<number> {
    return this.prisma.quitAttempt.count({ where: { user_id: userId } });
  }

  createFirst(userId: number, startedAt: Date): Promise<QuitAttempt> {
    return this.prisma.quitAttempt.create({
      data: {
        user_id: userId,
        attemptNumber: 1,
        startedAt,
      },
    });
  }

  createNext(
    userId: number,
    attemptNumber: number,
    startedAt: Date,
  ): Promise<QuitAttempt> {
    return this.prisma.quitAttempt.create({
      data: {
        user_id: userId,
        attemptNumber,
        startedAt,
      },
    });
  }

  close(attemptId: number, data: CloseAttemptData): Promise<QuitAttempt> {
    return this.prisma.quitAttempt.update({
      where: { attempt_id: attemptId },
      data: {
        endedAt: data.endedAt,
        endOutcome: data.endOutcome,
        durationSeconds: data.durationSeconds,
        cigarettesAvoided: data.cigarettesAvoided,
        moneySaved: data.moneySaved,
        lifeMinutesGained: data.lifeMinutesGained,
        slipCigarettesSmoked: data.slipCigarettesSmoked,
      },
    });
  }

  deleteById(attemptId: number): Promise<void> {
    return this.prisma.quitAttempt
      .delete({ where: { attempt_id: attemptId } })
      .then(() => undefined);
  }

  reopen(attemptId: number): Promise<QuitAttempt> {
    return this.prisma.quitAttempt.update({
      where: { attempt_id: attemptId },
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
  }

  sumSlipCigarettesBetween(
    userId: number,
    from: Date,
    to: Date,
  ): Promise<number> {
    return this.prisma.slipEvent
      .aggregate({
        where: {
          user_id: userId,
          // (from, to] — closing slip at `to` counts on the ended attempt
          loggedAt: { gt: from, lte: to },
          cigarettesCount: { not: null },
        },
        _sum: { cigarettesCount: true },
      })
      .then((result) => result._sum.cigarettesCount ?? 0);
  }

  listSlipEventsBetween(
    userId: number,
    from: Date,
    to: Date,
  ): Promise<SlipEventSlice[]> {
    return this.prisma.slipEvent.findMany({
      where: {
        user_id: userId,
        // (from, to] — slip that started this attempt (at `from`) is excluded
        loggedAt: { gt: from, lte: to },
      },
      select: {
        loggedAt: true,
        cigarettesCount: true,
      },
      orderBy: { loggedAt: 'asc' },
    });
  }
}
