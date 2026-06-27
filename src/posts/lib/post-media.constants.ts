export const POST_MEDIA_KINDS = ['image', 'video'] as const;

export type PostMediaKind = (typeof POST_MEDIA_KINDS)[number];

export const DEFAULT_POST_MEDIA_KIND: PostMediaKind = 'image';
