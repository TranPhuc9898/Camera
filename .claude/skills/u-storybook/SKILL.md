---
name: u-storybook
description: 'Storybook RN 8 — component catalog for design system + reusable RN-UI primitives. CSF v3 stories, controls, decorators, switching app entry. Triggers — storybook, story, component catalog, visual catalog, addon controls, csf, storybook entry, isolated component.'
---

# u-storybook — RN Component Catalogue

## TL;DR

- Storybook RN 8 — component catalogue for design system primitives + reusable RN-UI parts
- Story files co-located: `src/lib/ui/<comp>/<comp>.stories.tsx`
- CSF v3 format: `default export = meta`, `export const <Name>: Story = { ... }`
- Toggle Storybook via env: `STORYBOOK=1 expo start` swaps app entry to Storybook UI
- Controls: declare `argTypes` per prop — sliders, selects, color pickers
- DO NOT story screens — story design-system primitives + small reusable components only

## When to load

Adding/editing a story, configuring Storybook, debugging "story not appearing", deciding whether to story a given component.

---

## Setup

```bash
npx expo install @storybook/react-native @storybook/addon-controls @storybook/addon-actions
npx sb-rn-get-stories      # generates the storybook entry
```

Add to `package.json`:

```jsonc
"scripts": {
  "storybook":         "STORYBOOK=1 expo start",
  "storybook:android": "STORYBOOK=1 expo run:android",
  "storybook:ios":     "STORYBOOK=1 expo run:ios"
}
```

Entry swap in `index.ts` (Expo Router uses dynamic entry):

```ts
import { registerRootComponent } from 'expo';

if (process.env.STORYBOOK) {
  const Storybook = require('./.storybook').default;
  registerRootComponent(Storybook);
} else {
  require('expo-router/entry');
}
```

`.storybook/index.ts` is generated — auto-discovers `**/*.stories.tsx`.

---

## What to story

| ✅ Story it                                                           | ❌ Don't story                               |
| --------------------------------------------------------------------- | -------------------------------------------- |
| Design-system primitives: `<Button>`, `<Input>`, `<Card>`, `<Avatar>` | Whole screens                                |
| Reusable composite UI: `<EmptyState>`, `<ErrorState>`, `<Skeleton>`   | Connected components (need TanStack/Zustand) |
| State variants of one component (loading, error, disabled)            | One-off feature components                   |
| Tokens visualization (color palette, spacing)                         | API-bound feature flows                      |

If the component imports a use-case hook → it doesn't belong in Storybook. Refactor: presentation prop-driven inner component + connected outer wrapper. Story the inner.

---

## Story file template

```tsx
// src/lib/ui/button/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-native';
import { Button } from './button';
import { View } from 'react-native';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  args: {
    children: 'Press me',
    intent: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
  },
  argTypes: {
    intent: { control: 'select', options: ['primary', 'secondary', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    onPress: { action: 'pressed' },
  },
  decorators: [
    (Story) => (
      <View className="bg-background-default p-md">
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { intent: 'primary' } };
export const Secondary: Story = { args: { intent: 'secondary' } };
export const Danger: Story = { args: { intent: 'danger' } };
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
```

**Naming:** `<Domain>/<ComponentName>` for `title` (`UI/Button`, `UI/Input`, `Tokens/Spacing`). Group siblings under same `Domain`.

---

## Decorator for theme + i18n

For stories that need providers:

```tsx
// .storybook/decorators.tsx
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/lib/i18n';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export const withProviders = (Story: any) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <I18nextProvider i18n={i18n}>
      <Story />
    </I18nextProvider>
  </GestureHandlerRootView>
);
```

Apply globally in `.storybook/preview.tsx`:

```ts
export const decorators = [withProviders];
```

---

## Controls — argTypes catalog

```ts
argTypes: {
  text:     { control: 'text' },
  count:    { control: 'number' },
  flag:     { control: 'boolean' },
  variant:  { control: 'select',  options: ['a', 'b'] },
  multi:    { control: 'multi-select', options: ['x', 'y', 'z'] },
  hue:      { control: 'color' },
  range:    { control: { type: 'range', min: 0, max: 100, step: 1 } },
  date:     { control: 'date' },
  callback: { action: 'fired' },          // logs to Actions tab
}
```

---

## Tokens visualization

Story your design system tokens for review:

```tsx
// src/theme/spacing.stories.tsx
import { AppSpacing } from '@/theme';

export const Spacing = () => (
  <View>
    {Object.entries(AppSpacing).map(([k, v]) => (
      <View key={k} className="mb-sm flex-row items-center gap-md">
        <Text className="w-12">{k}</Text>
        <View className="bg-primary-default" style={{ width: v, height: 16 }} />
        <Text className="text-text-secondary">{v}px</Text>
      </View>
    ))}
  </View>
);
```

Title: `Tokens/Spacing`.

---

## Running

```bash
npm run storybook
# Scan QR with Expo Go (if no native deps) OR custom dev client
```

Storybook UI shows:

- **Sidebar**: stories tree
- **Canvas**: live component
- **Controls**: change props live
- **Actions**: log fired callbacks

---

## Visual regression (optional)

For PR screenshots: integrate `@storybook/test-runner` + Chromatic OR Percy. Out of scope for default stack — add if multiple designers + frequent UI churn.

---

## Do / Don't

| ✅                                                | ❌                           |
| ------------------------------------------------- | ---------------------------- |
| Story design-system + reusable primitives         | Story whole screens          |
| Co-locate `<comp>.stories.tsx` next to component  | Separate `stories/` dir      |
| `argTypes` for every interactive prop             | Hard-coded args, no controls |
| `actions: { ... onPress: { action: 'pressed' } }` | `console.log` in handler     |
| Decorator for global providers                    | Wrap each story manually     |
| One file per component, multiple stories per file | One story per file           |

---

## Common pitfalls

- **Story doesn't show**: didn't run `npx sb-rn-get-stories` after creating new file. Re-run + restart Metro.
- **Story crashes — provider missing**: forgot decorator (i18n / gesture root). Add to `preview.tsx`.
- **`argTypes` ignored**: control type doesn't match prop type. Check `select` options vs union literal.
- **NativeWind classes don't apply**: forgot to import the global stylesheet in `.storybook/preview.tsx`.

---

## See also

- `u-design-system` — components stored here are the prime candidates
- `u-rn-ui` — primitives like `<Skeleton>`, `<Toast>`
- `u-testing` — RTL unit tests are separate from stories
- `u-accessibility` — story variants for a11y states (hover, focus, disabled)
