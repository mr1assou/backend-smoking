/** Simple hotness score for feed:hottest sorted set (higher = hotter). */
export function hottestScore(upvoteCount: number, downvoteCount: number): number {
  return upvoteCount - downvoteCount;
}
