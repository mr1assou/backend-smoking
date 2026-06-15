export const POST_FEED_PAGE_SIZE = 10;

export const POST_FEED_MAX_PAGE_SIZE = 50;

/** Max posts kept in Redis (latest by created_at). Older posts are read from Postgres. */
export const POST_FEED_REDIS_WINDOW_SIZE = 300;
