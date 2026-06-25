import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { ResetJourneyDto } from './dto/reset-journey.dto';
import { UpdateHabitSettingsDto } from './dto/update-habit-settings.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { UpdateProfileImageDto } from './dto/update-profile-image.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { UsersService } from './users.service';

@Controller('auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
  @Patch('me/habit-settings')
  updateHabitSettings(
    @Req() req: Request & { user: { userId: number } },
    @Body() dto: UpdateHabitSettingsDto,
  ) {
    return this.usersService.updateHabitSettings(req.user.userId, dto);
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
}
