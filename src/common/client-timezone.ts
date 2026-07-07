/** Validates an IANA timezone from the client; falls back to UTC when missing or invalid. */
export function resolveClientTimezone(
  value: string | undefined | null,
): string {
  const trimmed = value?.trim();
  if (!trimmed) return 'UTC';

  try {
    Intl.DateTimeFormat('en-US', { timeZone: trimmed });
    return trimmed;
  } catch {
    return 'UTC';
  }
}

export function readClientTimezoneHeader(
  header: string | string[] | undefined,
): string {
  const raw = Array.isArray(header) ? header[0] : header;
  return resolveClientTimezone(raw);
}
