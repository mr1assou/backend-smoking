export const POST_FEED_SORTS = ['newest', 'hottest', 'most_commented'] as const;

export type PostFeedSort = (typeof POST_FEED_SORTS)[number];

export const DEFAULT_POST_FEED_SORT: PostFeedSort = 'newest';
