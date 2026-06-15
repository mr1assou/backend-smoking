/** Top-level R2 object prefixes — add folders here as the app grows. */
export const R2_FOLDERS = {
  POSTS: 'posts',
  PROFILES: 'profiles',
  MESSAGES: 'messages',
} as const;

export type R2Folder = (typeof R2_FOLDERS)[keyof typeof R2_FOLDERS];

export const R2_ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type R2ImageContentType = (typeof R2_ALLOWED_IMAGE_TYPES)[number];

export const R2_ALLOWED_CHAT_MEDIA_TYPES = [
  ...R2_ALLOWED_IMAGE_TYPES,
  'video/mp4',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/wav',
] as const;

export type R2ChatMediaContentType = (typeof R2_ALLOWED_CHAT_MEDIA_TYPES)[number];

export const R2_PRESIGN_EXPIRES_SECONDS = 300;

export const R2_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
