/** Redis keys for ephemeral online presence. */
export const PRESENCE_ONLINE_SET = 'presence:online';

export function presenceUserSocketsKey(userId: number): string {
  return `presence:user:${userId}:sockets`;
}

export function presenceSocketUserKey(socketId: string): string {
  return `presence:socket:${socketId}`;
}
