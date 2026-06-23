import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import {
  normalizeUsernameSearchQuery,
  USERNAME_SEARCH_MAX_LENGTH,
  USERNAME_SEARCH_MIN_LENGTH,
} from '../lib/normalize-username-search';

export class SearchUsersQueryDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeUsernameSearchQuery(value) : value,
  )
  @IsString()
  @MinLength(USERNAME_SEARCH_MIN_LENGTH)
  @MaxLength(USERNAME_SEARCH_MAX_LENGTH)
  username!: string;
}
