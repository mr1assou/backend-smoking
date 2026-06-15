/** Tag ids — keep in sync with quit-smoking/constants/postTags.ts */
export const POST_TAG_IDS = [
  'seeking-advice',
  'discussion',
  'helpful-tips',
  'progress-update',
  'spreading-positivity',
  'success-story',
] as const;

export type PostTagId = (typeof POST_TAG_IDS)[number];
