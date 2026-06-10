import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
