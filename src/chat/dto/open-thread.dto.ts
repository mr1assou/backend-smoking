import { IsInt, Min } from 'class-validator';

export class OpenThreadDto {
  @IsInt()
  @Min(1)
  peer_user_id!: number;
}
