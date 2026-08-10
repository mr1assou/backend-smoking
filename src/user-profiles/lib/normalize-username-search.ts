export const USERNAME_SEARCH_MIN_LENGTH = 2;
export const USERNAME_SEARCH_MAX_LENGTH = 30;
export const USERNAME_SEARCH_RESULT_LIMIT = 20;

/** Strip leading @ and lowercase; keep hyphens for substring username search. */
export function normalizeUsernameSearchQuery(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}
