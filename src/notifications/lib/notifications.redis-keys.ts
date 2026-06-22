export const NOTIFICATION_EVENTS_CHANNEL = 'notifications:events';

export function notificationUserRoom(userId: number): string {
  return `user:${userId}`;
}
