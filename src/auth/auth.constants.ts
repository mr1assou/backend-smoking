/** Access token lifetime (JWT). */
export const ACCESS_TOKEN_EXPIRES_IN = '90d';

/** Refresh token lifetime (JWT + httpOnly cookie maxAge). */
export const REFRESH_TOKEN_EXPIRES_IN = '210d';

/** 7  months in milliseconds (cookie maxAge). */
export const REFRESH_COOKIE_MAX_AGE_MS = 210 * 24 * 60 * 60 * 1000;
