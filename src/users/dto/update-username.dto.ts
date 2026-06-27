import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import {
  normalizeStoredUsername,
  USERNAME_MAX_LENGTH,
} from '../lib/normalize-username';

export class UpdateUsernameDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeStoredUsername(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(USERNAME_MAX_LENGTH)
  username: string;
}
