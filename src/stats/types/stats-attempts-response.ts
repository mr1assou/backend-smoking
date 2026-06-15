import type { AttemptStatsRow } from './attempt-stats-row';
import type { StatsEconomics } from './stats-economics';

export type StatsAttemptsResponse = {
  currency: string;
  timezone: string;
  economics: StatsEconomics;
  attempts: AttemptStatsRow[];
};
