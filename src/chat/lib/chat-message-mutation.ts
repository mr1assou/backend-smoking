/** How long after send a user may edit their own text message. */
export const CHAT_MESSAGE_EDIT_WINDOW_MS = 5 * 60 * 1000;

export function isWithinChatMessageEditWindow(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() <= CHAT_MESSAGE_EDIT_WINDOW_MS;
}
