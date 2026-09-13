export const USERNAME_MAX_LENGTH = 15;
/** Stored value includes the leading `@`. */
export const USERNAME_STORED_MAX_LENGTH = USERNAME_MAX_LENGTH + 1;

/** Strip leading `@` characters and lowercase. */
export function stripUsernameAtPrefix(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

/**
 * Persisted usernames are always `@handle` (lowercase, handle capped at 15).
 * Empty / `@`-only input becomes `""`.
 */
export function normalizeStoredUsername(raw: string): string {
  const handle = stripUsernameAtPrefix(raw).slice(0, USERNAME_MAX_LENGTH);
  if (!handle) return '';
  return `@${handle}`;
}

/** Display / mention form with a single leading `@`. */
export function formatUsernameMention(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}
