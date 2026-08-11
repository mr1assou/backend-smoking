import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min, ValidateIf } from 'class-validator';
import {
  R2_ALLOWED_POST_MEDIA_TYPES,
  R2_MAX_POST_VIDEO_BYTES,
  R2_MAX_POST_VIDEO_DURATION_MS,
  isVideoContentType,
} from '../lib/r2.constants';

export class CreatePostUploadUrlDto {
  @IsIn([...R2_ALLOWED_POST_MEDIA_TYPES])
  contentType!: (typeof R2_ALLOWED_POST_MEDIA_TYPES)[number];

  /** Declared upload size in bytes (validated before issuing a PUT URL). */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(R2_MAX_POST_VIDEO_BYTES)
  fileSizeBytes!: number;

  /** Required for videos — milliseconds. */
  @ValidateIf((dto: CreatePostUploadUrlDto) =>
    isVideoContentType(dto.contentType),
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(R2_MAX_POST_VIDEO_DURATION_MS)
  durationMs?: number;
}
