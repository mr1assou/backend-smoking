import { Module } from '@nestjs/common';
import { AttemptsModule } from '../attempts/attempts.module';
import { BadgesModule } from '../badges/badges.module';
import { FreedomPointsModule } from '../freedom-points/freedom-points.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { GoalsController } from './goals.controller';
import { GoalsRepository } from './goals.repository';
import { GoalsService } from './goals.service';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AttemptsModule,
    FreedomPointsModule,
    BadgesModule,
  ],
  controllers: [GoalsController],
  providers: [GoalsRepository, GoalsService],
  exports: [GoalsRepository],
})
export class GoalsModule {}
