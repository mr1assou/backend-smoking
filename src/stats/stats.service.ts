import { Injectable, NotFoundException } from '@nestjs/common';
import { AttemptsRepository } from '../attempts/attempts.repository';
import { AttemptsService } from '../attempts/attempts.service';
import { GoalsRepository } from '../goals/goals.repository';
import { UsersRepository } from '../users/users.repository';
import {
  buildAttemptsList,
  computeOverviewByRange,
  loadStatsUserContext,
} from './lib';
import { toGoalStatsRow } from './lib/goals-stats.builder';
import type { StatsAttemptsResponse, StatsGoalsResponse, StatsOverviewResponse } from './types';
@Injectable()
export class StatsService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly attemptsRepository: AttemptsRepository,
    private readonly attemptsService: AttemptsService,
    private readonly goalsRepository: GoalsRepository,
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
}
