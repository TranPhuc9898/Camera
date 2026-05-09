---
name: u-screen
description: 'Screen widgets, layout, theme, route screens for unicorn (Expo Router + RN). SafeArea, ScreenContainer, header, scroll, theme tokens via NativeWind. Triggers — screen, page, layout, SafeAreaView, ScreenContainer, header, KeyboardAvoiding, scroll view, route screen, dark mode.'
---

# u-screen — Screen Widget & Layout

## TL;DR

- Screen file pattern: `src/features/<f>/screens/<name>-screen.tsx`, route entry `app/<path>.tsx` re-exports the screen
- Wrap with `<ScreenContainer>` (SafeArea + bg + scroll defaults) — never raw `<SafeAreaView>` per screen
- Theme via NativeWind classes: `className="flex-1 bg-background-default p-md"` — never inline `style={{...}}` for static styling
- Header configured via `<Stack.Screen options={{...}}>` — DO NOT manually build headers
- Loading / error / empty are FIRST-CLASS states, not afterthoughts

## When to load

Adding a screen, restructuring layout, fixing safe-area / keyboard / scroll bugs, configuring header, dark mode.

---

## File pair

```
src/features/orders/screens/order-list-screen.tsx   ← all logic + JSX
app/(app)/orders/index.tsx                          ← route entry, re-exports
```

`app/(app)/orders/index.tsx`:

```tsx
import { OrderListScreen } from '@/features/orders/screens/order-list-screen';
export default OrderListScreen;
```

Generate both with `npx plop screen`.

---

## Screen template

```tsx
// src/features/orders/screens/order-list-screen.tsx
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/lib/ui/screen-container';
import { useGetOrders } from '../use-cases/use-get-orders';
import { useOrdersFilter } from '../orders-store';
import { OrderList } from '../components/order-list';
import { ScreenLoader } from '@/lib/ui/screen-loader';
import { ErrorState } from '@/lib/ui/error-state';
import { EmptyState } from '@/lib/ui/empty-state';
import { errorMessage } from '@/lib/i18n';

export function OrderListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const filter = useOrdersFilter();
  const { data, isLoading, error, refetch } = useGetOrders({ filter });

  return (
    <>
      <Stack.Screen options={{ title: t('orders.title') }} />
      <ScreenContainer scroll={false}>
        {isLoading && <ScreenLoader />}
        {error && <ErrorState message={errorMessage(t, error)} onRetry={refetch} />}
        {data?.length === 0 && <EmptyState message={t('orders.empty')} />}
        {data && data.length > 0 && (
          <OrderList orders={data} onPressItem={(id) => router.push(`/orders/${id}`)} />
        )}
      </ScreenContainer>
    </>
  );
}
```

---

## `<ScreenContainer>`

```tsx
// src/lib/ui/screen-container.tsx
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  className?: string;
  keyboardAvoiding?: boolean;
}

export function ScreenContainer({
  children,
  scroll = true,
  className = '',
  keyboardAvoiding = false,
}: Props) {
  const inner = scroll ? (
    <ScrollView className={`flex-1 ${className}`} contentContainerClassName="px-md py-md">
      {children}
    </ScrollView>
  ) : (
    <SafeAreaView className={`bg-background-default flex-1 ${className}`}>{children}</SafeAreaView>
  );

  if (!keyboardAvoiding)
    return <SafeAreaView className="bg-background-default flex-1">{inner}</SafeAreaView>;

  return (
    <SafeAreaView className="bg-background-default flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {inner}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

Use everywhere. NEVER reach for raw `<SafeAreaView>` in a screen.

---

## Header config (Expo Router)

```tsx
<Stack.Screen
  options={{
    title: t('orders.title'),
    headerLargeTitle: false,
    headerBackTitle: t('common.back'),
    headerRight: () => <IconButton icon="filter" onPress={openFilter} />,
  }}
/>
```

Configure inline at the top of the screen — Expo Router applies on focus. DO NOT mutate header in `useEffect`.

---

## Layout patterns

### Tab screen (with bottom tab bar)

Layout config in `app/(tabs)/_layout.tsx`:

```tsx
<Tabs screenOptions={{ headerShown: false }}>
  <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
  <Tabs.Screen name="orders/index" options={{ title: t('tabs.orders') }} />
</Tabs>
```

Screens inside use `<Stack>` if they have nested routes, or just render as-is.

### Modal

Route folder `app/(modal)/_layout.tsx`:

```tsx
<Stack screenOptions={{ presentation: 'modal' }}>
  <Stack.Screen name="filter" />
</Stack>
```

### Authenticated guard

```tsx
// app/(app)/_layout.tsx
const isAuthed = useIsAuthenticated();
if (!isAuthed) return <Redirect href="/sign-in" />;
return <Stack />;
```

See `u-navigation` for full deeplink + guard patterns.

---

## Theme tokens (NativeWind)

```tsx
<View className="bg-surface-elevated gap-sm rounded-lg p-md">
  <Text className="text-text-primary text-base font-semibold">{title}</Text>
  <Text className="text-text-secondary text-sm">{subtitle}</Text>
</View>
```

Do NOT inline:

```tsx
// ❌
<View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8 }}>
```

Tokens are mirrored from `src/theme/index.ts` into `tailwind.config.js`. Add new tokens to BOTH files. See `u-design-system`.

---

## Dark mode

NativeWind v4 uses `dark:` prefix:

```tsx
<View className="bg-white dark:bg-neutral-900">
```

But our token names already encode mode (`text-text-primary` resolves correctly per scheme). Use semantic tokens — avoid `dark:` prefix for app surfaces.

---

## Loading / Error / Empty

Three required states per data screen:

```tsx
if (isLoading) return <ScreenLoader />;
if (error) return <ErrorState message={errorMessage(t, error)} onRetry={refetch} />;
if (!data?.length) return <EmptyState message={t('feature.empty')} />;
return <ActualContent data={data} />;
```

`<ScreenLoader>`, `<ErrorState>`, `<EmptyState>` are reusable in `src/lib/ui/`. Customize per-feature only when the standard doesn't fit.

---

## Pull-to-refresh

```tsx
import { RefreshControl } from 'react-native'

<ScrollView
  refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
>
```

For FlashList, use `refreshing` + `onRefresh` props directly.

---

## Do / Don't

| ✅                               | ❌                                |
| -------------------------------- | --------------------------------- |
| `<ScreenContainer>`              | Raw `<SafeAreaView>` per screen   |
| `className="..."` (NativeWind)   | `style={{...}}` for static        |
| `<Stack.Screen options={...}>`   | Imperative header mutation        |
| Loading / error / empty branches | Render half-state with `?.`       |
| Generate via `npx plop screen`   | Copy-paste an existing screen     |
| Re-export in `app/<route>.tsx`   | Inline screen logic in route file |

---

## See also

- `u-rn-ui` — animations, gestures, FlashList
- `u-design-system` — tokens, dark mode rules
- `u-navigation` — Stack/Tabs config, header, redirects
- `u-form` — when screen is a form
- `u-sheet` — bottom sheet vs modal screen decision
