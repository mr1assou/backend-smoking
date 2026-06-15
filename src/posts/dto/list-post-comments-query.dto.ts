import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  POST_COMMENTS_MAX_PAGE_SIZE,
  POST_COMMENTS_PAGE_SIZE,
} from '../lib/post-comments-pagination.constants';

export class ListPostCommentsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(POST_COMMENTS_MAX_PAGE_SIZE)
  limit?: number;
}

export function resolveCommentsPagination(query: ListPostCommentsQueryDto): {
  offset: number;
  limit: number;
} {
  return {
    offset: query.offset ?? 0,
    limit: query.limit ?? POST_COMMENTS_PAGE_SIZE,
  };
}
