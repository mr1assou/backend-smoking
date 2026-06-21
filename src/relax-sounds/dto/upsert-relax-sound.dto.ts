import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertRelaxSoundDto {
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  slug!: string;

  @IsString()
  @MaxLength(120)
  label!: string;

  @IsString()
  @MaxLength(500)
  description!: string;

  @IsUrl({ require_protocol: true })
  audioUrl!: string;

  @IsString()
  @MaxLength(64)
  audioMimeType!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
