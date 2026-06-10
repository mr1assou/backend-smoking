import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  countSlipsSince(userId: number, since: Date): Promise<number> {
    return this.prisma.slipEvent.count({
      where: { user_id: userId, loggedAt: { gte: since } },
    });
  }

  countAllSlips(userId: number): Promise<number> {
    return this.prisma.slipEvent.count({ where: { user_id: userId } });
  }

  listSlipEvents(userId: number) {
    return this.prisma.slipEvent.findMany({
      where: { user_id: userId },
      select: {
        slip_event_id: true,
        outcome: true,
        cigarettesCount: true,
        loggedAt: true,
        closedAttempt: {
          select: {
            attemptNumber: true,
            startedAt: true,
          },
        },
      },
      orderBy: { loggedAt: 'desc' },
    });
  }
}
