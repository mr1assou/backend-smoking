import { Module } from '@nestjs/common';
import { AttemptsModule } from '../attempts/attempts.module';
import { FreedomPointsModule } from '../freedom-points/freedom-points.module';
import { GoalsModule } from '../goals/goals.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { StatsController } from './stats.controller';
import { StatsRepository } from './stats.repository';
import { StatsService } from './stats.service';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AttemptsModule,
    GoalsModule,
    FreedomPointsModule,
  ],
  controllers: [StatsController],
  providers: [StatsService, StatsRepository],
})
export class StatsModule {}
