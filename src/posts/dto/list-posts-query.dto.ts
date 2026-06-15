import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  POST_FEED_MAX_PAGE_SIZE,
  POST_FEED_PAGE_SIZE,
} from '../lib/post-feed-pagination.constants';
import { POST_FEED_SORTS } from '../lib/post-feed-sort.constants';
import { POST_TAG_IDS } from '../lib/post-tags.constants';

export class ListPostsQueryDto {
  @IsOptional()
  @IsIn([...POST_FEED_SORTS])
  sort?: (typeof POST_FEED_SORTS)[number];

  @IsOptional()
  @IsIn([...POST_TAG_IDS])
  tag_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(POST_FEED_MAX_PAGE_SIZE)
  limit?: number;
}

export function resolveFeedPagination(query: ListPostsQueryDto): {
  offset: number;
  limit: number;
} {
  return {
    offset: query.offset ?? 0,
    limit: query.limit ?? POST_FEED_PAGE_SIZE,
  };
}
