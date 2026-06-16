import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  LEADERBOARD_MAX_PAGE_SIZE,
  LEADERBOARD_PAGE_SIZE,
} from '../lib/leaderboard-pagination.constants';

export class ListLeaderboardQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LEADERBOARD_MAX_PAGE_SIZE)
  limit?: number;
}

export function resolveLeaderboardPagination(query: ListLeaderboardQueryDto): {
  offset: number;
  limit: number;
} {
  return {
    offset: query.offset ?? 0,
    limit: query.limit ?? LEADERBOARD_PAGE_SIZE,
  };
}
