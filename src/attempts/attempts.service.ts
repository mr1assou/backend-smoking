import { Injectable } from '@nestjs/common';
import { QuitAttempt } from '@prisma/client';
import {
  computeSegmentedAttemptImpact,
  mapEconomicsSegmentRow,
} from '../stats/lib/segmented-attempt-impact';
import {
  EconomicsSegmentsRepository,
  habitEconomicsFromUser,
} from './economics-segments.repository';
import { AttemptsRepository } from './attempts.repository';
import {
  computeAttemptImpact,
  parsePackPrice,
  type AttemptEconomics,
  type AttemptImpactSnapshot,
} from '../stats/lib/attempt-impact';

export type AttemptSummary = {
  attemptId: number;
  attemptNumber: number;
  startedAt: string;
  endedAt: string | null;
  endOutcome: string | null;
  durationSeconds: number;
  cigarettesAvoided: number;
  moneySaved: number;
  lifeMinutesGained: number;
  slipCigarettesSmoked: number;
};

@Injectable()
export class AttemptsService {
  constructor(
    private readonly attemptsRepository: AttemptsRepository,
    private readonly economicsSegmentsRepository: EconomicsSegmentsRepository,
  ) {}

  async ensureFirstAttempt(
    userId: number,
    startedAt: Date,
    economics?: ReturnType<typeof habitEconomicsFromUser>,
  ): Promise<QuitAttempt> {
    const active = await this.attemptsRepository.findActive(userId);
    if (active) return active;

    const count = await this.attemptsRepository.countForUser(userId);
    const attempt =
      count > 0
        ? await this.attemptsRepository.createNext(userId, count + 1, startedAt)
        : await this.attemptsRepository.createFirst(userId, startedAt);

    if (economics) {
      await this.economicsSegmentsRepository.seedInitial(
        attempt.attempt_id,
        startedAt,
        economics,
      );
    }

    return attempt;
  }

  async seedEconomicsForAttempt(
    attemptId: number,
    effectiveFrom: Date,
    economics: ReturnType<typeof habitEconomicsFromUser>,
  ): Promise<void> {
    const existing =
      await this.economicsSegmentsRepository.listForAttempt(attemptId);
    if (existing.length > 0) return;

    await this.economicsSegmentsRepository.seedInitial(
      attemptId,
      effectiveFrom,
      economics,
    );
  }

  buildEconomics(user: {
    cigarettesPerDay: number | null;
    cigarettesPerPack: number | null;
    packPrice: string | null;
  }): AttemptEconomics {
    return {
      cigarettesPerDay: user.cigarettesPerDay ?? 0,
      cigarettesPerPack: user.cigarettesPerPack ?? 20,
      packPrice: parsePackPrice(user.packPrice),
    };
  }

  computeSnapshot(
    economics: AttemptEconomics,
    startedAt: Date,
    endedAt: Date,
    slipCigarettesSmoked: number,
  ) {
    return computeAttemptImpact(
      economics,
      startedAt,
      endedAt,
      slipCigarettesSmoked,
    );
  }

  async computeSegmentedSnapshot(
    userId: number,
    attempt: QuitAttempt,
    timelineStart: Date,
    endedAt: Date,
    pendingSlip?: { loggedAt: Date; cigarettesCount: number },
  ): Promise<AttemptImpactSnapshot> {
    const segments = await this.economicsSegmentsRepository.listForAttempt(
      attempt.attempt_id,
    );

    const slipEvents = await this.attemptsRepository.listSlipEventsBetween(
      userId,
      timelineStart,
      endedAt,
    );

    if (pendingSlip) {
      slipEvents.push({
        loggedAt: pendingSlip.loggedAt,
        cigarettesCount: pendingSlip.cigarettesCount,
      });
    }

    if (segments.length === 0) {
      const economics = this.buildEconomics({
        cigarettesPerDay: 0,
        cigarettesPerPack: 20,
        packPrice: null,
      });
      const slipCigarettes = slipEvents.reduce(
        (sum, event) => sum + Math.max(0, event.cigarettesCount ?? 0),
        0,
      );
      return this.computeSnapshot(
        economics,
        timelineStart,
        endedAt,
        slipCigarettes,
      );
    }

    return computeSegmentedAttemptImpact(
      segments.map(mapEconomicsSegmentRow),
      timelineStart,
      endedAt,
      slipEvents,
    );
  }

  async getActiveAttempt(userId: number): Promise<QuitAttempt | null> {
    return this.attemptsRepository.findActive(userId);
  }

  async listCompletedAttempts(userId: number): Promise<AttemptSummary[]> {
    const rows = await this.attemptsRepository.listCompleted(userId);
    return rows.map((row) => this.toSummary(row));
  }

  toSummary(row: QuitAttempt): AttemptSummary {
    return {
      attemptId: row.attempt_id,
      attemptNumber: row.attemptNumber,
      startedAt: row.startedAt.toISOString(),
      endedAt: row.endedAt?.toISOString() ?? null,
      endOutcome: row.endOutcome,
      durationSeconds: row.durationSeconds,
      cigarettesAvoided: row.cigarettesAvoided,
      moneySaved: row.moneySaved,
      lifeMinutesGained: row.lifeMinutesGained,
      slipCigarettesSmoked: row.slipCigarettesSmoked,
    };
  }
}
