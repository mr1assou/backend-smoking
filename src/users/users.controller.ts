import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CheckUsernameQueryDto } from './dto/check-username-query.dto';
import { ResetJourneyDto } from './dto/reset-journey.dto';
import { UpdateHabitSettingsDto } from './dto/update-habit-settings.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { UpdateProfileImageDto } from './dto/update-profile-image.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { UpdatePremiumDto } from './dto/update-premium.dto';
import { UsersService } from './users.service';

@Controller('auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Public — used by onboarding step 5 and settings (debounced). */
  @Get('username/available')
  checkUsernameAvailable(@Query() query: CheckUsernameQueryDto) {
    return this.usersService.checkUsernameAvailable(
      query.username,
      query.excludeUserId,
    );
  }

  @UseGuards(JwtGuard)
  @Get('me')
  getMe(@Req() req: Request & { user: { userId: number } }) {
    return this.usersService.getMe(req.user.userId);
  }

  @UseGuards(JwtGuard)
  @Patch('me/onboarding')
  saveOnboarding(
    @Req() req: Request & { user: { userId: number } },
    @Body() dto: UpdateOnboardingDto,
  ) {
    return this.usersService.updateOnboarding(req.user.userId, dto);
  }

  @UseGuards(JwtGuard)
  @Patch('me/preferences')
  updatePreferences(
    @Req() req: Request & { user: { userId: number } },
    @Body() dto: UpdateUserPreferencesDto,
  ) {
    return this.usersService.updatePreferences(req.user.userId, dto);
  }

  @UseGuards(JwtGuard)
  @Patch('me/profile-image')
  updateProfileImage(
    @Req() req: Request & { user: { userId: number } },
    @Body() dto: UpdateProfileImageDto,
  ) {
    return this.usersService.updateProfileImage(req.user.userId, dto);
  }

  @UseGuards(JwtGuard)
  @Patch('me/username')
  updateUsername(
    @Req() req: Request & { user: { userId: number } },
    @Body() dto: UpdateUsernameDto,
  ) {
    return this.usersService.updateUsername(req.user.userId, dto);
  }

  @UseGuards(JwtGuard)
  @Patch('me/habit-settings')
  updateHabitSettings(
    @Req() req: Request & { user: { userId: number } },
    @Body() dto: UpdateHabitSettingsDto,
  ) {
    return this.usersService.updateHabitSettings(req.user.userId, dto);
  }

  @UseGuards(JwtGuard)
  @Patch('me/premium')
  updatePremium(
    @Req() req: Request & { user: { userId: number } },
    @Body() dto: UpdatePremiumDto,
  ) {
    return this.usersService.updatePremium(req.user.userId, dto);
  }

  @UseGuards(JwtGuard)
  @Post('me/reset-journey')
  @HttpCode(HttpStatus.OK)
  resetJourney(
    @Req() req: Request & { user: { userId: number } },
    @Body() dto: ResetJourneyDto,
  ) {
    return this.usersService.resetJourney(req.user.userId, dto);
  }

  @UseGuards(JwtGuard)
  @Post('me/push-token')
  @HttpCode(HttpStatus.OK)
  registerPushToken(
    @Req() req: Request & { user: { userId: number } },
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.usersService.registerPushToken(req.user.userId, dto);
  }

  @UseGuards(JwtGuard)
  @Get('me/push-token')
  getPushTokenStatus(@Req() req: Request & { user: { userId: number } }) {
    return this.usersService.getPushTokenStatus(req.user.userId);
  }

  @UseGuards(JwtGuard)
  @Post('me/push-token/clear')
  @HttpCode(HttpStatus.OK)
  clearPushTokens(@Req() req: Request & { user: { userId: number } }) {
    return this.usersService.clearPushTokens(req.user.userId);
  }
}
