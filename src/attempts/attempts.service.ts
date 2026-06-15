import { Injectable } from '@nestjs/common';
import { QuitAttempt } from '@prisma/client';
import {
  computeAttemptImpact,
  parsePackPrice,
  type AttemptEconomics,
} from '../stats/lib/attempt-impact';
import { AttemptsRepository } from './attempts.repository';
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
  constructor(private readonly attemptsRepository: AttemptsRepository) {}

  async ensureFirstAttempt(userId: number, startedAt: Date): Promise<QuitAttempt> {
    const active = await this.attemptsRepository.findActive(userId);
    if (active) return active;

    const count = await this.attemptsRepository.countForUser(userId);
    if (count > 0) {
      return this.attemptsRepository.createNext(userId, count + 1, startedAt);
    }

    return this.attemptsRepository.createFirst(userId, startedAt);
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
    return computeAttemptImpact(economics, startedAt, endedAt, slipCigarettesSmoked);
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
