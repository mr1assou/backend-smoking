/** Stored in `users.image_url` for bundled default avatars. */
export const DEFAULT_PROFILE_IMAGE_MALE_PATHS = [
  'profile1.webp',
  'profile4.webp',
  'profile5.webp',
] as const;

export const DEFAULT_PROFILE_IMAGE_FEMALE_PATHS = [
  'profile2.webp',
  'profile3.webp',
  'profile6.webp',
  'profile7.webp',
] as const;

export const DEFAULT_PROFILE_IMAGE_PATHS = [
  ...DEFAULT_PROFILE_IMAGE_MALE_PATHS,
  ...DEFAULT_PROFILE_IMAGE_FEMALE_PATHS,
] as const;

type DefaultProfileImagePath = (typeof DEFAULT_PROFILE_IMAGE_PATHS)[number];

type NormalizedSex = 'male' | 'female' | 'prefer_not_say';

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function normalizeSex(sex: string | null | undefined): NormalizedSex | null {
  const normalized = sex?.trim().toLowerCase() ?? '';
  if (normalized === 'male') return 'male';
  if (normalized === 'female') return 'female';
  if (normalized.includes('prefer')) return 'prefer_not_say';
  return null;
}

function profileImagePoolForSex(
  sex: string | null | undefined,
): readonly DefaultProfileImagePath[] {
  const normalized = normalizeSex(sex);
  if (normalized === 'male') return DEFAULT_PROFILE_IMAGE_MALE_PATHS;
  if (normalized === 'female') return DEFAULT_PROFILE_IMAGE_FEMALE_PATHS;
  return DEFAULT_PROFILE_IMAGE_PATHS;
}

export function defaultProfileImageForSex(
  sex: string | null | undefined,
): DefaultProfileImagePath {
  return pickRandom(profileImagePoolForSex(sex));
}

export function isDefaultProfileImagePath(
  imageUrl: string | null | undefined,
): boolean {
  const name = imageUrl?.trim().split('/').pop()?.split('?')[0] ?? '';
  return (DEFAULT_PROFILE_IMAGE_PATHS as readonly string[]).includes(name);
}
