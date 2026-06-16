import { Module } from '@nestjs/common';
import { AttemptsModule } from '../attempts/attempts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FreedomPointsRepository } from './freedom-points.repository';
import { FreedomPointsService } from './freedom-points.service';

@Module({
  imports: [PrismaModule, AttemptsModule],
  providers: [FreedomPointsRepository, FreedomPointsService],
  exports: [FreedomPointsService, FreedomPointsRepository],
})
export class FreedomPointsModule {}
