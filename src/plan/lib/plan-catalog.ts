import planData from '../quit-plan.json';

type PlanTask = { id: string };
type PlanDay = { day: number; tasks: PlanTask[] };

const days = (planData as { chapters: { days: PlanDay[] }[] }).chapters.flatMap(
  (chapter) => chapter.days,
);

const taskIdsByDay = new Map<number, string[]>();

for (const day of days) {
  taskIdsByDay.set(
    day.day,
    day.tasks.map((task) => task.id),
  );
}

export function getPlanTaskIds(day: number): string[] {
  return taskIdsByDay.get(day) ?? [];
}

export function isValidPlanTaskId(day: number, taskId: string): boolean {
  return getPlanTaskIds(day).includes(taskId);
}

export function areAllPlanTasksDone(
  day: number,
  taskStates: Record<string, boolean>,
): boolean {
  const taskIds = getPlanTaskIds(day);
  return (
    taskIds.length > 0 && taskIds.every((taskId) => taskStates[taskId] === true)
  );
}
