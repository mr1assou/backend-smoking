import { IsIn } from 'class-validator';
import { R2_ALLOWED_CHAT_MEDIA_TYPES } from '../lib/r2.constants';

export class CreateChatUploadUrlDto {
  @IsIn([...R2_ALLOWED_CHAT_MEDIA_TYPES])
  contentType!: (typeof R2_ALLOWED_CHAT_MEDIA_TYPES)[number];
}
