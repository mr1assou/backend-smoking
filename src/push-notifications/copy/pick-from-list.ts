export function pickFromList<T>(items: readonly T[], seed: number): T {
  return items[((seed % items.length) + items.length) % items.length]!;
}
