import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { POST_TAG_IDS } from '../lib/post-tags.constants';
import { POST_IMAGE_FRAMES, PostImageCropDto } from './post-image.dto';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn([...POST_TAG_IDS])
  tag_id!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  image_url?: string;

  @IsOptional()
  @IsIn(POST_IMAGE_FRAMES)
  image_frame?: (typeof POST_IMAGE_FRAMES)[number];

  @IsOptional()
  @ValidateNested()
  @Type(() => PostImageCropDto)
  image_crop?: PostImageCropDto;
}
