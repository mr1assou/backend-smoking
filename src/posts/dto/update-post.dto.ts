import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { POST_TAG_IDS } from '../lib/post-tags.constants';
import { POST_MEDIA_KINDS } from '../lib/post-media.constants';
import { POST_IMAGE_FRAMES, PostImageCropDto } from './post-image.dto';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsIn([...POST_TAG_IDS])
  tag_id?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  image_url?: string | null;

  @IsOptional()
  @IsIn(POST_IMAGE_FRAMES)
  image_frame?: (typeof POST_IMAGE_FRAMES)[number] | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => PostImageCropDto)
  image_crop?: PostImageCropDto | null;

  @IsOptional()
  @IsIn(POST_MEDIA_KINDS)
  media_kind?: (typeof POST_MEDIA_KINDS)[number] | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  media_duration_ms?: number | null;
}
