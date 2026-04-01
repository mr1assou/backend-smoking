import { IsUUID } from 'class-validator';

export class CreateSessionDto {
  @IsUUID()
  location_id: string;
}
