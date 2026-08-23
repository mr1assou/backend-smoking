import { IsArray, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsIn(['en', 'fr'])
  locale?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  motivationCardIndex?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  tipsCardIndex?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  savedTipCardIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  savedMotivationCardIds?: string[];
}
