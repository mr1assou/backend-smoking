export type PushKind = 'streak' | 'tip' | 'money' | 'motivation';

/** Day-of-year slot so tips/motivations rotate daily, not every few minutes. */
export function dailyContentSlot(now = new Date()): number {
  const startOfYear = new Date(now.getFullYear(), 0, 0).getTime();
  return Math.floor((now.getTime() - startOfYear) / 86_400_000);
}
