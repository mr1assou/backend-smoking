import type { StatsImpact } from './stats-impact';

export type AttemptStatsRow = StatsImpact & {
  attemptNumber: number;
  startedAt: string;
  endedAt: string | null;
  endOutcome: string | null;
  isActive: boolean;
};
