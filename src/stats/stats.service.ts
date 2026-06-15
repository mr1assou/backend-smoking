import { Injectable } from '@nestjs/common';
import { AttemptsRepository } from '../attempts/attempts.repository';
import { AttemptsService } from '../attempts/attempts.service';
import { UsersRepository } from '../users/users.repository';
import {
  buildAttemptsList,
  computeOverviewByRange,
  loadStatsUserContext,
} from './lib';
import type { StatsAttemptsResponse, StatsOverviewResponse } from './types';

@Injectable()
export class StatsService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly attemptsRepository: AttemptsRepository,
    private readonly attemptsService: AttemptsService,
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
      context.economics,
      context.active,
      context.activeSnapshot,
      context.now,
      this.attemptsRepository,
      this.attemptsService,
      this.usersRepository,
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
      context.economics,
      context.active,
      context.activeSnapshot,
      context.now,
      this.attemptsRepository,
      this.attemptsService,
      this.usersRepository,
    );

    return {
      currency: context.currency,
      timezone: context.timezone,
      economics: {
        cigarettesPerDay: context.economics.cigarettesPerDay,
        cigarettesPerPack: context.economics.cigarettesPerPack,
        packCost: context.economics.packPrice,
      },
      attempts,
    };
  }
}
