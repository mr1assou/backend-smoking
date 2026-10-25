/** Stored in `users.image_url` for bundled default avatars, independent of sex. */
export const DEFAULT_PROFILE_IMAGE_PATHS = [
  'profile8.webp',
  'profile9.webp',
  'profile10.webp',
  'profile11.webp',
  'profile12.webp',
  'profile13.webp',
  'profile1.webp',
  'profile3.webp',
  'profile4.webp',
  'profile5.webp',
  'profile6.webp',
  'profile7.webp',
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
  return (DEFAULT_PROFILE_IMAGE_PATHS as readonly string[]).includes(name);
}
