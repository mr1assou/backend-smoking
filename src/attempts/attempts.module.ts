import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AttemptsRepository } from './attempts.repository';
import { AttemptsService } from './attempts.service';
import { EconomicsSegmentsRepository } from './economics-segments.repository';

@Module({
  imports: [PrismaModule],
  providers: [AttemptsRepository, AttemptsService, EconomicsSegmentsRepository],
  exports: [AttemptsRepository, AttemptsService, EconomicsSegmentsRepository],
})
export class AttemptsModule {}
