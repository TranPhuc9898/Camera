/**
 * App color palette with light + dark variants.
 * Keys follow the semantic naming convention: role + optional variant.
 */

const neutral = {
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
} as const;

export const AppColors = {
  light: {
    primary: '#2563eb',
    primaryFg: '#ffffff',
    surface: '#ffffff',
    surfaceFg: '#111827',
    surfaceMuted: '#f3f4f6',
    border: '#e5e7eb',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#0891b2',
    neutral,
  },
  dark: {
    primary: '#3b82f6',
    primaryFg: '#ffffff',
    surface: '#111827',
    surfaceFg: '#f9fafb',
    surfaceMuted: '#1f2937',
    border: '#374151',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#22d3ee',
    neutral,
  },
} as const;

export type ColorScheme = keyof typeof AppColors;
