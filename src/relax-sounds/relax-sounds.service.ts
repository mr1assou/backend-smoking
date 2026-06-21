import { Injectable } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { CreateMusicUploadUrlDto } from './dto/create-music-upload-url.dto';
import { UpsertRelaxSoundDto } from './dto/upsert-relax-sound.dto';
import { RelaxSoundsRepository } from './relax-sounds.repository';

@Injectable()
export class RelaxSoundsService {
  constructor(
    private readonly relaxSoundsRepository: RelaxSoundsRepository,
    private readonly storageService: StorageService,
  ) {}

  listActive() {
    return this.relaxSoundsRepository.listActive();
  }

  createUploadUrl(dto: CreateMusicUploadUrlDto) {
    return this.storageService.createMusicUploadUrl(
      dto.slug,
      dto.fileName,
      dto.contentType,
    );
  }

  upsert(dto: UpsertRelaxSoundDto) {
    this.storageService.assertMusicUrl(dto.audioUrl);

    return this.relaxSoundsRepository.upsert({
      slug: dto.slug,
      label: dto.label,
      description: dto.description,
      audioUrl: dto.audioUrl,
      audioMimeType: dto.audioMimeType,
      durationMs: dto.durationMs,
      sizeBytes: dto.sizeBytes,
      sortOrder: dto.sortOrder,
    });
  }
}
