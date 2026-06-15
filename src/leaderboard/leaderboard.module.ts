import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PresenceModule } from '../presence/presence.module';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardRepository } from './leaderboard.repository';
import { LeaderboardService } from './leaderboard.service';

@Module({
  imports: [PrismaModule, PresenceModule],
  controllers: [LeaderboardController],
  providers: [LeaderboardRepository, LeaderboardService],
})
export class LeaderboardModule {}
