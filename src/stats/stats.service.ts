import { Injectable, NotFoundException } from '@nestjs/common';
import { AttemptsRepository } from '../attempts/attempts.repository';
import { AttemptsService } from '../attempts/attempts.service';
import { FreedomPointsRepository } from '../freedom-points/freedom-points.repository';
import { FreedomPointsService } from '../freedom-points/freedom-points.service';
import { GoalsRepository } from '../goals/goals.repository';
import { UsersRepository } from '../users/users.repository';
import {
  buildAttemptsList,
  computeOverviewByRange,
  loadStatsUserContext,
} from './lib';
import { toGoalStatsRow } from './lib/goals-stats.builder';
import type {
  StatsAttemptsResponse,
  StatsFreedomPointsResponse,
  StatsGoalsResponse,
  StatsOverviewResponse,
} from './types';
@Injectable()
export class StatsService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly attemptsRepository: AttemptsRepository,
    private readonly attemptsService: AttemptsService,
    private readonly goalsRepository: GoalsRepository,
    private readonly freedomPointsService: FreedomPointsService,
    private readonly freedomPointsRepository: FreedomPointsRepository,
  ) {}

  async getOverview(userId: number): Promise<StatsOverviewResponse> {
    const context = await loadStatsUserContext(
      userId,
      this.usersRepository,
      this.attemptsRepository,
      this.attemptsService,
    );

    const attempts = await buildAttemptsList(
      userId,
      context.activeTimelineStart,
      context.active,
      context.activeSnapshot,
      context.now,
      this.attemptsRepository,
      this.attemptsService,
    );

    return {
      currency: context.currency,
      economics: {
        cigarettesPerDay: context.economics.cigarettesPerDay,
        cigarettesPerPack: context.economics.cigarettesPerPack,
        packCost: context.economics.packPrice,
      },
      byRange: computeOverviewByRange(
        attempts,
        context.economics,
        context.now.getTime(),
      ),
    };
  }

  async getAttempts(userId: number): Promise<StatsAttemptsResponse> {
    const context = await loadStatsUserContext(
      userId,
      this.usersRepository,
      this.attemptsRepository,
      this.attemptsService,
    );

    const attempts = await buildAttemptsList(
      userId,
      context.activeTimelineStart,
      context.active,
      context.activeSnapshot,
      context.now,
      this.attemptsRepository,
      this.attemptsService,
    );

    return {
      currency: context.currency,
      economics: {
        cigarettesPerDay: context.economics.cigarettesPerDay,
        cigarettesPerPack: context.economics.cigarettesPerPack,
        packCost: context.economics.packPrice,
      },
      attempts,
    };
  }

  async getGoals(userId: number): Promise<StatsGoalsResponse> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const rows = await this.goalsRepository.listAllForUser(userId);

    return {
      currency: user.currency ?? 'USD',
      goals: rows.map((row) => toGoalStatsRow(row)),
    };
  }

  async getFreedomPoints(userId: number): Promise<StatsFreedomPointsResponse> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const sync = await this.freedomPointsService.syncSmokeFreeDayRewards(userId);
    const entries = await this.freedomPointsRepository.listLedgerForUser(userId);

    return {
      totalFreedomPoints: sync.totalFreedomPoints,
      entries,
    };
  }
}
