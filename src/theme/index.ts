import { AppSpacing } from './spacing';
import { AppRadius } from './radius';
import { AppDurations } from './duration';
import { AppTypography } from './typography';
import { AppColors } from './colors';

export * from './theme';
export * from './spacing';
export * from './radius';
export * from './duration';
export * from './typography';
export * from './colors';
export * from './shadows';

export const theme = {
  spacing: AppSpacing,
  radius: AppRadius,
  duration: AppDurations,
  typography: AppTypography,
  colors: AppColors,
} as const;

export type Theme = typeof theme;
