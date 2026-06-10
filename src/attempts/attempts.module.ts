import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AttemptsRepository } from './attempts.repository';
import { AttemptsService } from './attempts.service';

@Module({
  imports: [PrismaModule],
  providers: [AttemptsRepository, AttemptsService],
  exports: [AttemptsRepository, AttemptsService],
})
export class AttemptsModule {}
