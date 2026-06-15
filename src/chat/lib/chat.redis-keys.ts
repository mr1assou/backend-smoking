export const CHAT_EVENTS_CHANNEL = 'chat:events';

export function chatUserRoom(userId: number): string {
  return `user:${userId}`;
}

export function chatThreadRoom(threadId: number): string {
  return `thread:${threadId}`;
}
