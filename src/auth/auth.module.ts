import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { GoalsModule } from '../goals/goals.module';
import { MailModule } from '../mail/mail.module';
import { PlanModule } from '../plan/plan.module';
import { PresenceModule } from '../presence/presence.module';
import { RedisModule } from '../redis/redis.module';
import { SlipEventsModule } from '../slip-events/slip-events.module';
import { StatsModule } from '../stats/stats.module';
import { UsersModule } from '../users/users.module';
import { UsersController } from '../users/users.controller';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { EmailOtpService } from './email-otp/email-otp.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleOAuthService } from './google/google-oauth.service';
import { GoogleTokenService } from './google/google-token.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    PresenceModule,
    UsersModule,
    SlipEventsModule,
    StatsModule,
    GoalsModule,
    PlanModule,
    RedisModule,
    MailModule,
  ],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    EmailOtpService,
    GoogleTokenService,
    GoogleOAuthService,
    JwtStrategy,
    JwtRefreshStrategy,
  ],
})
export class AuthModule {}
