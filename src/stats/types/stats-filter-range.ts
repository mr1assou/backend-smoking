export const STATS_FILTER_RANGES = ['7d', '30d', '90d', 'lifetime'] as const;

export type StatsFilterRange = (typeof STATS_FILTER_RANGES)[number];
