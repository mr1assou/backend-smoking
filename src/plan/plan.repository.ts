import { Injectable } from '@nestjs/common';
import { PlanDayProgress } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProgressForUser(userId: number): Promise<PlanDayProgress[]> {
    return this.prisma.planDayProgress.findMany({
      where: { user_id: userId },
      orderBy: { plan_day: 'asc' },
    });
  }

  findDayProgress(
    userId: number,
    planDay: number,
  ): Promise<PlanDayProgress | null> {
    return this.prisma.planDayProgress.findUnique({
      where: {
        user_id_plan_day: {
          user_id: userId,
          plan_day: planDay,
        },
      },
    });
  }

  upsertDayProgress(
    userId: number,
    planDay: number,
    taskStates: Record<string, boolean>,
    completedAt: Date | null,
  ): Promise<PlanDayProgress> {
    return this.prisma.planDayProgress.upsert({
      where: {
        user_id_plan_day: {
          user_id: userId,
          plan_day: planDay,
        },
      },
      create: {
        user_id: userId,
        plan_day: planDay,
        task_states: taskStates,
        completed_at: completedAt,
      },
      update: {
        task_states: taskStates,
        completed_at: completedAt,
      },
    });
  }
}
