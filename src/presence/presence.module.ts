import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { PresenceController } from './presence.controller';
import { PresenceGateway } from './presence.gateway';
import { PresenceRepository } from './presence.repository';
import { PresenceService } from './presence.service';

@Module({
  imports: [JwtModule.register({}), UsersModule],
  controllers: [PresenceController],
  providers: [PresenceRepository, PresenceService, PresenceGateway],
  exports: [PresenceService],
})
export class PresenceModule {}
