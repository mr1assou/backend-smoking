import type { UserGoal } from '@prisma/client';
import type { GoalType } from '../../goals/goals.constants';
import type { GoalStatsRow } from '../types/stats-goals-response';

type GoalWithAttempt = UserGoal & {
  attempt: { attemptNumber: number };
};

export function toGoalStatsRow(goal: GoalWithAttempt): GoalStatsRow {
  return {
    id: goal.goal_id,
    attemptId: goal.attempt_id,
    attemptNumber: goal.attempt.attemptNumber,
    type: goal.type as GoalType,
    target: goal.target,
    status: goal.status,
    startedAt: goal.started_at.toISOString(),
    completedAt: goal.completed_at?.toISOString() ?? null,
    failedAt: goal.failed_at?.toISOString() ?? null,
    failedReason: goal.failed_reason,
  };
}
