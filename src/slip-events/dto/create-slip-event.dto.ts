import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { SLIP_OUTCOMES } from '../types/slip-outcome';

export class CreateSlipEventDto {
  @IsIn(SLIP_OUTCOMES)
  outcome!: (typeof SLIP_OUTCOMES)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  cigarettesCount?: number;
}
