export function canonicalThreadPair(
  userIdA: number,
  userIdB: number,
): [number, number] {
  return userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
}

export function peerUserIdFromThread(
  thread: { user_one_id: number; user_two_id: number },
  viewerUserId: number,
): number {
  return thread.user_one_id === viewerUserId
    ? thread.user_two_id
    : thread.user_one_id;
}
