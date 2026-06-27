export const USERNAME_MAX_LENGTH = 30;

/** Persisted usernames are always lowercase and capped at 30 characters. */
export function normalizeStoredUsername(raw: string): string {
  return raw.trim().toLowerCase().slice(0, USERNAME_MAX_LENGTH);
}
