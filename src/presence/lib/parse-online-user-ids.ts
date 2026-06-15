/** Parses `?ids=1,2,3` into unique positive user ids. */
export function parseOnlineUserIds(idsParam?: string): number[] {
  const trimmed = idsParam?.trim();
  if (!trimmed) return [];

  return [
    ...new Set(
      trimmed
        .split(',')
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
}
