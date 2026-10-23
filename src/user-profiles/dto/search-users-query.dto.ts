import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  normalizeUsernameSearchQuery,
  USERNAME_SEARCH_MAX_PAGE_SIZE,
  USERNAME_SEARCH_MAX_LENGTH,
  USERNAME_SEARCH_MIN_LENGTH,
  USERNAME_SEARCH_RESULT_LIMIT,
} from '../lib/normalize-username-search';

export class SearchUsersQueryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeUsernameSearchQuery(value) : value,
  )
  @IsString()
  @MinLength(USERNAME_SEARCH_MIN_LENGTH)
  @MaxLength(USERNAME_SEARCH_MAX_LENGTH)
  username!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(USERNAME_SEARCH_MAX_PAGE_SIZE)
  limit = USERNAME_SEARCH_RESULT_LIMIT;
}
