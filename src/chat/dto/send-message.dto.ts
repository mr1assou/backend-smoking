import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { CHAT_MESSAGE_TYPES } from '../types/chat.types';

export class SendMessageDto {
  @IsIn([...CHAT_MESSAGE_TYPES])
  message_type!: (typeof CHAT_MESSAGE_TYPES)[number];

  @ValidateIf((dto: SendMessageDto) => dto.message_type === 'text')
  @IsString()
  @MaxLength(5000)
  text?: string;

  @ValidateIf((dto: SendMessageDto) => dto.message_type !== 'text')
  @IsUrl({ require_protocol: true })
  media_url?: string;

  @ValidateIf((dto: SendMessageDto) => dto.message_type !== 'text')
  @IsString()
  media_mime_type?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  media_duration_ms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  media_size_bytes?: number;
}
