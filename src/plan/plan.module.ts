import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { PlanController } from './plan.controller';
import { PlanRepository } from './plan.repository';
import { PlanService } from './plan.service';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [PlanController],
  providers: [PlanRepository, PlanService],
  exports: [PlanService],
})
export class PlanModule {}
