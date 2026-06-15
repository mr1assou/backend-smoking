import type { StatsFilterRange } from './stats-filter-range';
import type { StatsEconomics } from './stats-economics';
import type { StatsImpact } from './stats-impact';

export type StatsOverviewByRange = Record<StatsFilterRange, StatsImpact>;

export type StatsOverviewResponse = {
  currency: string;
  economics: StatsEconomics;
  byRange: StatsOverviewByRange;
};
