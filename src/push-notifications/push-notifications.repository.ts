import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type PushRecipient = {
  token: string;
  userId: number;
  username: string | null;
  streakStart: Date | null;
  quitDate: Date | null;
  cigarettesPerDay: number | null;
  cigarettesPerPack: number | null;
  packPrice: string | null;
  currency: string | null;
  tipsCardIndex: number;
  motivationCardIndex: number;
};

@Injectable()
export class PushNotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listStreakPushRecipients(): Promise<PushRecipient[]> {
    return this.prisma.pushToken
      .findMany({
        select: {
          token: true,
          user: {
            select: {
              user_id: true,
              username: true,
              streakStart: true,
              quitDate: true,
              cigarettesPerDay: true,
              cigarettesPerPack: true,
              packPrice: true,
              currency: true,
              tipsCardIndex: true,
              motivationCardIndex: true,
            },
          },
        },
      })
      .then((rows) =>
        rows.map((row) => ({
          token: row.token,
          userId: row.user.user_id,
          username: row.user.username,
          streakStart: row.user.streakStart,
          quitDate: row.user.quitDate,
          cigarettesPerDay: row.user.cigarettesPerDay,
          cigarettesPerPack: row.user.cigarettesPerPack,
          packPrice: row.user.packPrice,
          currency: row.user.currency,
          tipsCardIndex: row.user.tipsCardIndex,
          motivationCardIndex: row.user.motivationCardIndex,
        })),
      );
  }
}
