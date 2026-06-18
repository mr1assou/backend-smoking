import { IsIn, IsNumber, Min } from 'class-validator';
import { GOAL_TYPES } from '../goals.constants';

export class SetUserGoalDto {
  @IsIn([...GOAL_TYPES])
  type!: (typeof GOAL_TYPES)[number];

  @IsNumber()
  @Min(1)
  target!: number;
}
