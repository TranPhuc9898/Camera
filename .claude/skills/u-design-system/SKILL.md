---
name: u-design-system
description: 'NativeWind v4 + design tokens — AppSpacing, AppRadius, AppDurations, light/dark colors, typography, breakpoints. Triggers — design system, tokens, NativeWind, Tailwind, theme, colors, spacing, radius, typography, dark mode, breakpoints, semantic tokens.'
---

# u-design-system — Tokens & NativeWind

## TL;DR

- Tokens defined in `src/theme/index.ts`, mirrored to `tailwind.config.js`
- 4 token families: `AppSpacing`, `AppRadius`, `AppDurations`, `colors` (light/dark scheme)
- Semantic color tokens (`text-text-primary`, `bg-surface-elevated`) — never raw hex in components
- Add new token? Edit BOTH files atomically
- NativeWind v4: `className="..."` everywhere, no inline `style={{...}}` for static

## When to load

Adding/changing a token, fixing dark-mode bug, choosing color/spacing, configuring NativeWind, building a reusable component.

---

## Token files

```
src/theme/index.ts          ← runtime tokens (TS, used in JS code)
tailwind.config.js          ← compile-time tokens (used by NativeWind)
src/theme/colors.ts         ← color palette (raw hex, light + dark)
```

### `src/theme/index.ts`

```ts
export const AppSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const AppRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const AppDurations = {
  fast: 150,
  normal: 240,
  slow: 400,
} as const;

export const colors = {
  light: {
    background: { default: '#ffffff', elevated: '#fafafa', muted: '#f4f4f5' },
    text: { primary: '#09090b', secondary: '#71717a', muted: '#a1a1aa', inverse: '#ffffff' },
    surface: { elevated: '#ffffff', muted: '#f4f4f5' },
    primary: { default: '#2563eb', hover: '#1d4ed8', pressed: '#1e40af' },
    border: { default: '#e4e4e7', strong: '#d4d4d8' },
    status: { success: '#16a34a', warning: '#f59e0b', error: '#dc2626', info: '#0284c7' },
  },
  dark: {
    background: { default: '#09090b', elevated: '#18181b', muted: '#27272a' },
    text: { primary: '#fafafa', secondary: '#a1a1aa', muted: '#71717a', inverse: '#09090b' },
    surface: { elevated: '#18181b', muted: '#27272a' },
    primary: { default: '#3b82f6', hover: '#60a5fa', pressed: '#93c5fd' },
    border: { default: '#27272a', strong: '#3f3f46' },
    status: { success: '#22c55e', warning: '#fbbf24', error: '#f87171', info: '#38bdf8' },
  },
} as const;
```

### `tailwind.config.js`

```js
const { AppSpacing, AppRadius, colors } = require('./src/theme');

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      spacing: AppSpacing,
      borderRadius: AppRadius,
      colors: {
        background: colors.light.background,
        text: colors.light.text,
        surface: colors.light.surface,
        primary: colors.light.primary,
        border: colors.light.border,
        status: colors.light.status,
        // dark variants resolved via NativeWind v4 darkMode
      },
    },
  },
  darkMode: 'class', // NativeWind v4 manages with useColorScheme
  plugins: [require('nativewind/preset')],
};
```

NativeWind v4 swaps the active palette based on `useColorScheme()` — components use semantic class names that resolve correctly in both modes.

---

## Class name conventions

```tsx
<View className="bg-background-default flex-1 gap-sm px-md py-lg">
  <Text className="text-text-primary text-base font-semibold">{title}</Text>
  <Text className="text-text-secondary text-sm">{subtitle}</Text>
  <View className="bg-surface-elevated border-border-default rounded-lg border p-md" />
</View>
```

**Naming:** `<group>-<variant>` (e.g. `text-text-primary`, `bg-surface-elevated`). The first segment is the Tailwind utility prefix (`bg`, `text`, `border`); everything after maps to the token tree.

---

## Spacing & radius

```tsx
className = 'p-md gap-sm rounded-lg';
// = padding 16, gap 8, borderRadius 12
```

Always use named tokens (`md`, `lg`, etc.). NEVER `p-[16px]` — that's an escape hatch and bypasses dark-mode-safe semantics.

---

## Typography scale

Use built-in Tailwind size + weight:

```tsx
<Text className="text-2xl font-bold">       {/* heading */}
<Text className="text-lg font-semibold">    {/* subheading */}
<Text className="text-base font-medium">    {/* body emphasized */}
<Text className="text-sm">                  {/* body / caption */}
<Text className="text-xs uppercase">        {/* eyebrow */}
```

Custom font family configured in `tailwind.config.js`:

```js
theme: { extend: { fontFamily: { sans: ['Inter'], display: ['Geist'] } } }
```

---

## Variants — `cva`

For components with state-driven styling:

```tsx
import { cva } from 'class-variance-authority'

const button = cva('rounded-lg items-center justify-center px-md py-sm', {
  variants: {
    intent: {
      primary:   'bg-primary-default',
      secondary: 'bg-surface-elevated border border-border-default',
      danger:    'bg-status-error',
    },
    size: { sm: 'h-9', md: 'h-11', lg: 'h-12' },
    disabled: { true: 'opacity-50' },
  },
  defaultVariants: { intent: 'primary', size: 'md' },
})

<Pressable className={button({ intent, size, disabled })}>
```

Keep one `cva` per reusable component. Variants over conditional class concatenation.

---

## Dark mode

The semantic tokens (`bg-background-default`, `text-text-primary`) auto-resolve. Only use `dark:` prefix when the design genuinely diverges:

```tsx
<Image className="opacity-100 dark:opacity-90" /> // when needed
```

Test BOTH modes for every screen — toggle via `useThemeStore` or device setting.

---

## Adding a new token

1. Add to `src/theme/index.ts` (e.g. `AppSpacing.huge = 64`)
2. Add to `tailwind.config.js` extend block
3. Use `p-huge` in components
4. If color: add to BOTH `colors.light` and `colors.dark`

If you forget step 2, the class is silently no-op.

---

## Do / Don't

| ✅                                                  | ❌                                       |
| --------------------------------------------------- | ---------------------------------------- |
| `className="bg-surface-elevated"`                   | `style={{ backgroundColor: '#fafafa' }}` |
| `p-md` (token)                                      | `p-[16px]` (raw value)                   |
| Semantic name (`text-text-primary`)                 | Raw color (`text-zinc-900`)              |
| `cva` for variants                                  | Ternary class concat                     |
| Update both `theme/index.ts` + `tailwind.config.js` | One only                                 |

---

## See also

- `u-screen` — `<ScreenContainer>` uses tokens
- `u-rn-ui` — animation durations come from `AppDurations`
- `u-storybook` — visual catalogue for variants
- `u-accessibility` — color contrast rules over tokens
