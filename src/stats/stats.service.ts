import { Injectable, NotFoundException } from '@nestjs/common';
import { QuitAttempt } from '@prisma/client';
import { AttemptsRepository } from '../attempts/attempts.repository';
import { AttemptsService } from '../attempts/attempts.service';
import { toUtcIso, utcInstantNow } from '../common/utc-instant';
import type { AttemptImpactSnapshot } from './attempt-impact';
import { resolveSlipCigarettesCount } from '../slip-events/slip-cigarette-count';
import type { SlipOutcome } from '../slip-events/types/slip-outcome';
import { UsersRepository } from '../users/users.repository';
import { StatsRepository } from './stats.repository';

export type StatsImpact = {
  durationSeconds: number;
  cigarettesAvoided: number;
  moneySaved: number;
  lifeMinutesGained: number;
  slipCigarettesSmoked: number;
};

export type CurrentStats = StatsImpact & {
  attemptNumber: number;
  startedAt: string;
  streakStart: string;
  slipCount: number;
};

export type LifetimeStats = StatsImpact & {
  totalAttempts: number;
  completedAttempts: number;
  slipCount: number;
};

export type AttemptStatsRow = StatsImpact & {
  attemptNumber: number;
  startedAt: string;
  endedAt: string | null;
  endOutcome: string | null;
  isActive: boolean;
};

export type SlipStatsRow = {
  slipEventId: number;
  outcome: string;
  cigarettesCount: number;
  loggedAt: string;
  attemptNumber: number | null;
  attemptStartedAt: string | null;
};

export type StatsEconomics = {
  cigarettesPerDay: number;
  cigarettesPerPack: number;
  packCost: number;
};

export type UserStatsResponse = {
  currency: string;
  timezone: string;
  economics: StatsEconomics;
  current: CurrentStats | null;
  lifetime: LifetimeStats;
  attempts: AttemptStatsRow[];
  slips: SlipStatsRow[];
};

@Injectable()
export class StatsService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly attemptsRepository: AttemptsRepository,
    private readonly attemptsService: AttemptsService,
    private readonly statsRepository: StatsRepository,
  ) {}

  async getUserStats(userId: number): Promise<UserStatsResponse> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const economics = this.attemptsService.buildEconomics(user);
    const now = utcInstantNow();
    const active = await this.attemptsRepository.findActive(userId);
    const completed = await this.attemptsRepository.listCompleted(userId);

    let current: CurrentStats | null = null;
    let activeSnapshot: AttemptImpactSnapshot | null = null;

    if (active) {
      const slipCigarettes = await this.usersRepository.sumSlipCigarettesSince(
        userId,
        active.startedAt,
      );
      const slipCount = await this.statsRepository.countSlipsSince(
        userId,
        active.startedAt,
      );
      activeSnapshot = this.attemptsService.computeSnapshot(
        economics,
        active.startedAt,
        now,
        slipCigarettes,
      );
      current = {
        attemptNumber: active.attemptNumber,
        startedAt: toUtcIso(active.startedAt),
        streakStart: toUtcIso(user.streakStart ?? active.startedAt),
        slipCount,
        ...activeSnapshot,
      };
    }

    const completedTotals = completed.reduce<StatsImpact>(
      (acc, row) => ({
        durationSeconds: acc.durationSeconds + row.durationSeconds,
        cigarettesAvoided: acc.cigarettesAvoided + row.cigarettesAvoided,
        moneySaved: acc.moneySaved + row.moneySaved,
        lifeMinutesGained: acc.lifeMinutesGained + row.lifeMinutesGained,
        slipCigarettesSmoked:
          acc.slipCigarettesSmoked + row.slipCigarettesSmoked,
      }),
      {
        durationSeconds: 0,
        cigarettesAvoided: 0,
        moneySaved: 0,
        lifeMinutesGained: 0,
        slipCigarettesSmoked: 0,
      },
    );

    const lifetimeSlipCount = await this.statsRepository.countAllSlips(userId);
    const slipRows = await this.statsRepository.listSlipEvents(userId);

    const lifetime: LifetimeStats = {
      totalAttempts: completed.length + (active ? 1 : 0),
      completedAttempts: completed.length,
      slipCount: lifetimeSlipCount,
      durationSeconds:
        completedTotals.durationSeconds + (activeSnapshot?.durationSeconds ?? 0),
      cigarettesAvoided:
        completedTotals.cigarettesAvoided +
        (activeSnapshot?.cigarettesAvoided ?? 0),
      moneySaved:
        completedTotals.moneySaved + (activeSnapshot?.moneySaved ?? 0),
      lifeMinutesGained:
        completedTotals.lifeMinutesGained +
        (activeSnapshot?.lifeMinutesGained ?? 0),
      slipCigarettesSmoked:
        completedTotals.slipCigarettesSmoked +
        (activeSnapshot?.slipCigarettesSmoked ?? 0),
    };

    const attempts = await this.buildAttemptsList(
      userId,
      economics,
      active,
      activeSnapshot,
      now,
    );

    return {
      currency: user.currency ?? 'USD',
      timezone: user.timezone?.trim() || 'UTC',
      economics: {
        cigarettesPerDay: economics.cigarettesPerDay,
        cigarettesPerPack: economics.cigarettesPerPack,
        packCost: economics.packPrice,
      },
      current,
      lifetime,
      attempts,
      slips: slipRows.map((row) => this.toSlipStatsRow(row)),
    };
  }

  private toSlipStatsRow(row: {
    slip_event_id: number;
    outcome: string;
    cigarettesCount: number | null;
    loggedAt: Date;
    closedAttempt: { attemptNumber: number; startedAt: Date } | null;
  }): SlipStatsRow {
    const cigarettesCount =
      resolveSlipCigarettesCount(
        row.outcome as SlipOutcome,
        row.cigarettesCount ?? undefined,
      ) ?? 0;

    return {
      slipEventId: row.slip_event_id,
      outcome: row.outcome,
      cigarettesCount,
      loggedAt: toUtcIso(row.loggedAt),
      attemptNumber: row.closedAttempt?.attemptNumber ?? null,
      attemptStartedAt: row.closedAttempt?.startedAt
        ? toUtcIso(row.closedAttempt.startedAt)
        : null,
    };
  }

  private async buildAttemptsList(
    userId: number,
    economics: ReturnType<AttemptsService['buildEconomics']>,
    active: QuitAttempt | null,
    activeSnapshot: AttemptImpactSnapshot | null,
    now: Date,
  ): Promise<AttemptStatsRow[]> {
    const rows = await this.attemptsRepository.listAllForUser(userId);

    return Promise.all(
      rows.map(async (row) => {
        const isActive = row.endedAt === null;

        if (isActive && active && row.attempt_id === active.attempt_id && activeSnapshot) {
          return {
            attemptNumber: row.attemptNumber,
            startedAt: toUtcIso(row.startedAt),
            endedAt: null,
            endOutcome: null,
            isActive: true,
            ...activeSnapshot,
          };
        }

        if (isActive) {
          const slipCigarettes = await this.usersRepository.sumSlipCigarettesSince(
            userId,
            row.startedAt,
          );
          const snapshot = this.attemptsService.computeSnapshot(
            economics,
            row.startedAt,
            now,
            slipCigarettes,
          );
          return {
            attemptNumber: row.attemptNumber,
            startedAt: toUtcIso(row.startedAt),
            endedAt: null,
            endOutcome: null,
            isActive: true,
            ...snapshot,
          };
        }

        return {
          attemptNumber: row.attemptNumber,
          startedAt: toUtcIso(row.startedAt),
          endedAt: row.endedAt ? toUtcIso(row.endedAt) : null,
          endOutcome: row.endOutcome,
          isActive: false,
          durationSeconds: row.durationSeconds,
          cigarettesAvoided: row.cigarettesAvoided,
          moneySaved: row.moneySaved,
          lifeMinutesGained: row.lifeMinutesGained,
          slipCigarettesSmoked: row.slipCigarettesSmoked,
        };
      }),
    );
  }
}
