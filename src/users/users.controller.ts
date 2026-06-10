import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
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
}
