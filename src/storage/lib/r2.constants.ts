/** Top-level R2 object prefixes — add folders here as the app grows. */
export const R2_FOLDERS = {
  POSTS: 'posts',
  PROFILES: 'profiles',
  MESSAGES: 'messages',
  MUSIC: 'music',
} as const;

export type R2Folder = (typeof R2_FOLDERS)[keyof typeof R2_FOLDERS];

export const R2_ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type R2ImageContentType = (typeof R2_ALLOWED_IMAGE_TYPES)[number];

export const R2_ALLOWED_POST_MEDIA_TYPES = [
  ...R2_ALLOWED_IMAGE_TYPES,
  'video/mp4',
  'video/quicktime',
] as const;

export type R2PostMediaContentType =
  (typeof R2_ALLOWED_POST_MEDIA_TYPES)[number];

export const R2_ALLOWED_CHAT_MEDIA_TYPES = [
  ...R2_ALLOWED_IMAGE_TYPES,
  'video/mp4',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/wav',
] as const;

export type R2ChatMediaContentType =
  (typeof R2_ALLOWED_CHAT_MEDIA_TYPES)[number];

export const R2_PRESIGN_EXPIRES_SECONDS = 300;

/** Profile avatar after client compression. */
export const R2_MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

/** Post still image after client compression. */
export const R2_MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Post video (duration also capped client-side). */
export const R2_MAX_POST_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

export const R2_MAX_POST_VIDEO_DURATION_MS = 60_000; // 60s

/** @deprecated Prefer R2_MAX_POST_IMAGE_BYTES / R2_MAX_PROFILE_IMAGE_BYTES. */
export const R2_MAX_IMAGE_BYTES = R2_MAX_POST_IMAGE_BYTES;

export function isVideoContentType(contentType: string): boolean {
  return contentType.startsWith('video/');
}

export function maxBytesForPostContentType(contentType: string): number {
  return isVideoContentType(contentType)
    ? R2_MAX_POST_VIDEO_BYTES
    : R2_MAX_POST_IMAGE_BYTES;
}
