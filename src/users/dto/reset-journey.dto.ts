import { IsIn, IsISO8601, IsOptional, ValidateIf } from 'class-validator';

export class ResetJourneyDto {
  @IsOptional()
  @IsIn(['Now', 'Custom'])
  quitDatePreset?: 'Now' | 'Custom';

  @ValidateIf((o: ResetJourneyDto) => o.quitDatePreset === 'Custom')
  @IsISO8601()
  quitDate?: string;
}
