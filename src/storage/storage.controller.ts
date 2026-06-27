import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CreateChatUploadUrlDto } from './dto/create-chat-upload-url.dto';
import { CreatePostUploadUrlDto } from './dto/create-post-upload-url.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { StorageService } from './storage.service';

@Controller()
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /** Returns a presigned PUT URL; client uploads directly to R2, then uses `imageUrl` in POST /posts. */
  @UseGuards(JwtGuard)
  @Post('upload-url')
  createUploadUrl(
    @Req() req: Request & { user: { userId: number } },
    @Body() dto: CreatePostUploadUrlDto,
  ) {
    return this.storageService.createPostUploadUrl(req.user.userId, dto);
  }

  /** Presigned PUT for profile avatars — store under `profiles/{userId}/`. */
  @UseGuards(JwtGuard)
  @Post('profile/upload-url')
  createProfileUploadUrl(
    @Req() req: Request & { user: { userId: number } },
    @Body() dto: CreateUploadUrlDto,
  ) {
    return this.storageService.createProfileUploadUrl(req.user.userId, dto);
  }

  /** Presigned PUT for chat media — stored under `messages/{userId}/`. */
  @UseGuards(JwtGuard)
  @Post('chat/upload-url')
  createChatUploadUrl(
    @Req() req: Request & { user: { userId: number } },
    @Body() dto: CreateChatUploadUrlDto,
  ) {
    return this.storageService.createChatMediaUploadUrl(
      req.user.userId,
      dto.contentType,
    );
  }
}
