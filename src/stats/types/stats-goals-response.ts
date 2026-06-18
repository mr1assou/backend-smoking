import type { GoalType } from '../../goals/goals.constants';

export type GoalStatsRow = {
  id: number;
  attemptId: number;
  attemptNumber: number;
  type: GoalType;
  target: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
  failedAt: string | null;
  failedReason: string | null;
};

export type StatsGoalsResponse = {
  currency: string;
  timezone: string;
  goals: GoalStatsRow[];
};
