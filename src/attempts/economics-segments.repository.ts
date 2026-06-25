import { Injectable } from '@nestjs/common';
import { AttemptEconomicsSegment, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type HabitEconomics = {
  cigarettesPerDay: number;
  cigarettesPerPack: number;
  packPrice: string | null;
};

type TxClient = Prisma.TransactionClient;

@Injectable()
export class EconomicsSegmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listForAttempt(attemptId: number): Promise<AttemptEconomicsSegment[]> {
    return this.prisma.attemptEconomicsSegment.findMany({
      where: { attempt_id: attemptId },
      orderBy: { effective_from: 'asc' },
    });
  }

  async seedInitial(
    attemptId: number,
    effectiveFrom: Date,
    economics: HabitEconomics,
    tx?: TxClient,
  ): Promise<AttemptEconomicsSegment> {
    const client = tx ?? this.prisma;
    return client.attemptEconomicsSegment.create({
      data: {
        attempt_id: attemptId,
        effective_from: effectiveFrom,
        cigarettes_per_day: economics.cigarettesPerDay,
        cigarettes_per_pack: economics.cigarettesPerPack,
        pack_price: economics.packPrice,
      },
    });
  }

  async appendIfChanged(
    attemptId: number,
    effectiveFrom: Date,
    economics: HabitEconomics,
    tx?: TxClient,
  ): Promise<AttemptEconomicsSegment | null> {
    const client = tx ?? this.prisma;
    const latest = await client.attemptEconomicsSegment.findFirst({
      where: { attempt_id: attemptId },
      orderBy: { effective_from: 'desc' },
    });

    if (latest && this.sameEconomics(latest, economics)) {
      return null;
    }

    return client.attemptEconomicsSegment.create({
      data: {
        attempt_id: attemptId,
        effective_from: effectiveFrom,
        cigarettes_per_day: economics.cigarettesPerDay,
        cigarettes_per_pack: economics.cigarettesPerPack,
        pack_price: economics.packPrice,
      },
    });
  }

  private sameEconomics(
    segment: AttemptEconomicsSegment,
    economics: HabitEconomics,
  ): boolean {
    return (
      segment.cigarettes_per_day === economics.cigarettesPerDay &&
      segment.cigarettes_per_pack === economics.cigarettesPerPack &&
      (segment.pack_price ?? null) === (economics.packPrice ?? null)
    );
  }
}

export function habitEconomicsFromUser(user: {
  cigarettesPerDay: number | null;
  cigarettesPerPack: number | null;
  packPrice: string | null;
}): HabitEconomics {
  return {
    cigarettesPerDay: user.cigarettesPerDay ?? 0,
    cigarettesPerPack: user.cigarettesPerPack ?? 20,
    packPrice: user.packPrice,
  };
}
