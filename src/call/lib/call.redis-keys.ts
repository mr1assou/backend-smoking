/** Redis pub/sub channel used to fan call signaling out across instances. */
export const CALL_EVENTS_CHANNEL = 'call:events';

/** Socket.IO room that receives every signaling event for a user. */
export function callUserRoom(userId: number): string {
  return `call-user:${userId}`;
}

/** Key holding a not-yet-answered incoming call for a recipient (short TTL). */
export function pendingCallKey(recipientUserId: number): string {
  return `call:pending:${recipientUserId}`;
}

/** Pending invite expires if the recipient never opens the app to answer. */
export const PENDING_CALL_TTL_SECONDS = 60;
