import { IsBoolean } from 'class-validator';

export class TogglePlanTaskDto {
  @IsBoolean()
  done!: boolean;
}
