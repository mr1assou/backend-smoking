import { IsIn, IsString, Matches, MaxLength } from 'class-validator';
import { R2_ALLOWED_CHAT_MEDIA_TYPES } from '../../storage/lib/r2.constants';

const MUSIC_AUDIO_CONTENT_TYPES = [...R2_ALLOWED_CHAT_MEDIA_TYPES] as const;

export class CreateMusicUploadUrlDto {
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  slug!: string;

  @IsString()
  @MaxLength(128)
  fileName!: string;

  @IsIn(MUSIC_AUDIO_CONTENT_TYPES)
  contentType!: (typeof MUSIC_AUDIO_CONTENT_TYPES)[number];
}
