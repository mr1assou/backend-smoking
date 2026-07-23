import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import {
  normalizeStoredUsername,
  USERNAME_STORED_MAX_LENGTH,
} from '../lib/normalize-username';

export class CheckUsernameQueryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeStoredUsername(value) : value,
  )
  @IsString()
  @MaxLength(USERNAME_STORED_MAX_LENGTH)
  username: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  })
  @IsInt()
  @Min(1)
  excludeUserId?: number;
}
