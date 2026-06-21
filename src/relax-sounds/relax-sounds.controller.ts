import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CreateMusicUploadUrlDto } from './dto/create-music-upload-url.dto';
import { UpsertRelaxSoundDto } from './dto/upsert-relax-sound.dto';
import { RelaxSoundsService } from './relax-sounds.service';

@Controller('relax-sounds')
export class RelaxSoundsController {
  constructor(private readonly relaxSoundsService: RelaxSoundsService) {}

  @Get()
  listActive() {
    return this.relaxSoundsService.listActive();
  }

  @UseGuards(JwtGuard)
  @Post('upload-url')
  createUploadUrl(@Body() dto: CreateMusicUploadUrlDto) {
    return this.relaxSoundsService.createUploadUrl(dto);
  }

  @UseGuards(JwtGuard)
  @Post('upsert')
  upsert(@Body() dto: UpsertRelaxSoundDto) {
    return this.relaxSoundsService.upsert(dto);
  }
}
