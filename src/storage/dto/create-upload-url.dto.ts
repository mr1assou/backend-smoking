import { IsIn } from 'class-validator';
import { R2_ALLOWED_IMAGE_TYPES } from '../lib/r2.constants';

export class CreateUploadUrlDto {
  @IsIn([...R2_ALLOWED_IMAGE_TYPES])
  contentType!: (typeof R2_ALLOWED_IMAGE_TYPES)[number];
}
