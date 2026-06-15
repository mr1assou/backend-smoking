import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BadgesRepository } from './badges.repository';
import { BadgesService } from './badges.service';

@Module({
  imports: [PrismaModule],
  providers: [BadgesRepository, BadgesService],
  exports: [BadgesService, BadgesRepository],
})
export class BadgesModule {}
