import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { UserProfilesService } from './user-profiles.service';

@Controller('users')
export class UserProfilesController {
  constructor(private readonly userProfiles: UserProfilesService) {}

  @UseGuards(JwtGuard)
  @Get(':userId/streak')
  getStreak(@Param('userId', ParseIntPipe) userId: number) {
    return this.userProfiles.getStreak(userId);
  }

  @UseGuards(JwtGuard)
  @Get(':userId/presence')
  getPresence(@Param('userId', ParseIntPipe) userId: number) {
    return this.userProfiles.getPresence(userId);
  }

  @UseGuards(JwtGuard)
  @Get(':userId/posts')
  listPosts(
    @Req() req: Request & { user: { userId: number } },
    @Param('userId', ParseIntPipe) userId: number,
    @Query('offset') offsetParam?: string,
  ) {
    const offset = Number.parseInt(offsetParam ?? '0', 10);
    return this.userProfiles.listPosts(
      userId,
      req.user.userId,
      Number.isFinite(offset) && offset > 0 ? offset : 0,
    );
  }

  @UseGuards(JwtGuard)
  @Get(':userId/comments')
  listComments(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('offset') offsetParam?: string,
  ) {
    const offset = Number.parseInt(offsetParam ?? '0', 10);
    return this.userProfiles.listComments(
      userId,
      Number.isFinite(offset) && offset > 0 ? offset : 0,
    );
  }

  @UseGuards(JwtGuard)
  @Get(':userId/upvoted-posts')
  listUpvotedPosts(
    @Req() req: Request & { user: { userId: number } },
    @Param('userId', ParseIntPipe) userId: number,
    @Query('offset') offsetParam?: string,
  ) {
    const offset = Number.parseInt(offsetParam ?? '0', 10);
    return this.userProfiles.listUpvotedPosts(
      userId,
      req.user.userId,
      Number.isFinite(offset) && offset > 0 ? offset : 0,
    );
  }
}
