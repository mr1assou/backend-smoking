import { IsIn } from 'class-validator';
import { R2_ALLOWED_POST_MEDIA_TYPES } from '../lib/r2.constants';

export class CreatePostUploadUrlDto {
  @IsIn([...R2_ALLOWED_POST_MEDIA_TYPES])
  contentType!: (typeof R2_ALLOWED_POST_MEDIA_TYPES)[number];
}
