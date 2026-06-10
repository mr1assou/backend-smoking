import { Module } from '@nestjs/common';
import { AttemptsModule } from '../attempts/attempts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule, AttemptsModule],
  providers: [UsersRepository, UsersService],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
