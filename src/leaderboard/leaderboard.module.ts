import { Module } from '@nestjs/common';
import { BadgesModule } from '../badges/badges.module';
import { FreedomPointsModule } from '../freedom-points/freedom-points.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PresenceModule } from '../presence/presence.module';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardRepository } from './leaderboard.repository';
import { LeaderboardService } from './leaderboard.service';

@Module({
  imports: [PrismaModule, PresenceModule, FreedomPointsModule, BadgesModule],
  controllers: [LeaderboardController],
  providers: [LeaderboardRepository, LeaderboardService],
})
export class LeaderboardModule {}
