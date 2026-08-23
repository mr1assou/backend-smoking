export type PushLocale = 'en' | 'fr';

/** User.locale is free text in the DB — anything but "fr" falls back to English. */
export function resolvePushLocale(
  value: string | null | undefined,
): PushLocale {
  return value === 'fr' ? 'fr' : 'en';
}
