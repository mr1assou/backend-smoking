/** Stored in `users.image_url` for bundled default avatars, independent of sex. */
export const DEFAULT_PROFILE_IMAGE_PATHS = [
  'profile24.webp',
  'profile14.webp',
  'profile15.webp',
  'profile16.webp',
  'profile17.webp',
  'profile18.webp',
  'profile19.webp',
  'profile20.webp',
  'profile21.webp',
  'profile22.webp',
  'profile23.webp',
  'profile4.webp',
  'profile5.webp',
] as const;

/** Older versions may still submit these filenames; their assets are no longer bundled. */
export const LEGACY_DEFAULT_PROFILE_IMAGE_PATHS = [
  'profile1.webp',
  'profile3.webp',
  'profile6.webp',
  'profile7.webp',
  'profile8.webp',
  'profile9.webp',
  'profile10.webp',
  'profile11.webp',
  'profile12.webp',
  'profile13.webp',
] as const;

export const ALL_DEFAULT_PROFILE_IMAGE_PATHS = [
  ...DEFAULT_PROFILE_IMAGE_PATHS,
  ...LEGACY_DEFAULT_PROFILE_IMAGE_PATHS,
] as const;

type DefaultProfileImagePath = (typeof DEFAULT_PROFILE_IMAGE_PATHS)[number];

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function defaultProfileImage(): DefaultProfileImagePath {
  return pickRandom(DEFAULT_PROFILE_IMAGE_PATHS);
}

export function isDefaultProfileImagePath(
  imageUrl: string | null | undefined,
): boolean {
  const name = imageUrl?.trim().split('/').pop()?.split('?')[0] ?? '';
  return (ALL_DEFAULT_PROFILE_IMAGE_PATHS as readonly string[]).includes(name);
}
