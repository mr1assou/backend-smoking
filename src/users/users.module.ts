import { Module } from '@nestjs/common';
import { AttemptsModule } from '../attempts/attempts.module';
import { BadgesModule } from '../badges/badges.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule, AttemptsModule, StorageModule, BadgesModule],
  providers: [UsersRepository, UsersService],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
