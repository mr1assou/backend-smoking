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
}
