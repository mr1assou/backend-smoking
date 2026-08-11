import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min } from 'class-validator';
import {
  R2_ALLOWED_IMAGE_TYPES,
  R2_MAX_PROFILE_IMAGE_BYTES,
} from '../lib/r2.constants';

export class CreateUploadUrlDto {
  @IsIn([...R2_ALLOWED_IMAGE_TYPES])
  contentType!: (typeof R2_ALLOWED_IMAGE_TYPES)[number];

  /** Declared upload size in bytes (validated before issuing a PUT URL). */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(R2_MAX_PROFILE_IMAGE_BYTES)
  fileSizeBytes!: number;
}
