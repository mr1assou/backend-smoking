import { IsIn, IsInt, Min, ValidateIf } from 'class-validator';
import { RELAPSE_MIN_CIGARETTE_COUNT } from '../lib/slip-cigarette-count';
import { SLIP_OUTCOMES } from '../types/slip-outcome';

export class CreateSlipEventDto {
  @IsIn(SLIP_OUTCOMES)
  outcome!: (typeof SLIP_OUTCOMES)[number];

  @ValidateIf((dto: CreateSlipEventDto) => dto.outcome === 'relapse')
  @IsInt()
  @Min(RELAPSE_MIN_CIGARETTE_COUNT)
  cigarettesCount?: number;
}
