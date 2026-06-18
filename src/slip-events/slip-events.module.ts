import { Module } from '@nestjs/common';
import { AttemptsModule } from '../attempts/attempts.module';
import { GoalsModule } from '../goals/goals.module';
import { UsersModule } from '../users/users.module';
import { SlipEventsController } from './slip-events.controller';
import { SlipEventsRepository } from './slip-events.repository';
import { SlipEventsService } from './slip-events.service';

@Module({
  imports: [UsersModule, AttemptsModule, GoalsModule],
  controllers: [SlipEventsController],
  providers: [SlipEventsRepository, SlipEventsService],
})
export class SlipEventsModule {}
