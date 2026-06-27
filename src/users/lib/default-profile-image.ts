/** Stored in `users.image_url` for bundled default avatars. */
export const DEFAULT_PROFILE_IMAGE_MALE = 'profile1.webp';
export const DEFAULT_PROFILE_IMAGE_FEMALE = 'profile2.webp';

export function defaultProfileImageForSex(
  sex: string | null | undefined,
): string {
  return sex === 'male'
    ? DEFAULT_PROFILE_IMAGE_MALE
    : DEFAULT_PROFILE_IMAGE_FEMALE;
}

export function isDefaultProfileImagePath(
  imageUrl: string | null | undefined,
): boolean {
  const name = imageUrl?.trim().split('/').pop() ?? '';
  return (
    name === DEFAULT_PROFILE_IMAGE_MALE || name === DEFAULT_PROFILE_IMAGE_FEMALE
  );
}
