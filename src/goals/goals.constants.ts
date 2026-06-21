export const GOAL_TYPES = ['smoke_free_days', 'cigarettes_avoided'] as const;

export type GoalType = (typeof GOAL_TYPES)[number];

export const GOAL_STATUSES = ['active', 'completed', 'failed'] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number];

export function isGoalType(value: string): value is GoalType {
  return (GOAL_TYPES as readonly string[]).includes(value);
}
