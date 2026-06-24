export type PlanDayProgressDto = {
  planDay: number;
  taskStates: Record<string, boolean>;
  completedAt: string | null;
};

export type PlanStateResponse = {
  streakStart: string | null;
  currentDay: number;
  unlockedThroughDay: number;
  totalDays: number;
  days: PlanDayProgressDto[];
};
