import { IsNumber, Max, Min } from 'class-validator';

export class PostImageCropDto {
  @IsNumber()
  @Min(1)
  @Max(4)
  scale!: number;

  @IsNumber()
  @Min(-1)
  @Max(1)
  panX!: number;

  @IsNumber()
  @Min(-1)
  @Max(1)
  panY!: number;
}

export const POST_IMAGE_FRAMES = ['square', 'portrait', 'landscape'] as const;
