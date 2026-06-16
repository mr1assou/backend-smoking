/** FP granted for each completed 24h smoke-free period in the current streak. */
export const FP_PER_SMOKE_FREE_DAY = 10;

export const FREEDOM_POINT_SOURCES = {
  SMOKE_FREE_DAY: 'smoke_free_day',
} as const;

export type FreedomPointSource =
  (typeof FREEDOM_POINT_SOURCES)[keyof typeof FREEDOM_POINT_SOURCES];
