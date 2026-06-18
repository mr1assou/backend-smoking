import { Module } from '@nestjs/common';
import { AttemptsModule } from '../attempts/attempts.module';
import { BadgesModule } from '../badges/badges.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { GoalsController } from './goals.controller';
import { GoalsRepository } from './goals.repository';
import { GoalsService } from './goals.service';

@Module({
  imports: [PrismaModule, UsersModule, AttemptsModule, BadgesModule],
  controllers: [GoalsController],
  providers: [GoalsRepository, GoalsService],
  exports: [GoalsRepository],
})
export class GoalsModule {}
