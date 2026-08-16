import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateHabitSettingsDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cigarettesPerDay: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cigarettesPerPack: number;

  @IsOptional()
  @IsString()
  packPrice?: string;

  /** Numeric pack price from the client (stored as string in DB). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  packCost?: number;
}
