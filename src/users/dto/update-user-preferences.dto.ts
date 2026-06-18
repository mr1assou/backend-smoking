import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  motivationCardIndex?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  tipsCardIndex?: number;
}
