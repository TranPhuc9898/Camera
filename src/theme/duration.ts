export const AppDurations = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  slower: 600,
} as const;

export type AppDurationsKey = keyof typeof AppDurations;
