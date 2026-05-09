---
name: u-navigation
description: 'Expo Router v6 — Stack/Tabs, route groups, layouts, params, deeplinks, auth guards, modal presentation, transitions. Triggers — navigation, expo router, route, Stack, Tabs, useRouter, Link, redirect, deeplink, auth guard, modal, transition, layout, params.'
---

# u-navigation — Expo Router v6

## TL;DR

- File-based routing under `app/`. Folder = route group. `_layout.tsx` = navigator config
- Imperative: `useRouter()` → `router.push/replace/back`. Declarative: `<Link href="...">`
- Route groups: `(tabs)`, `(app)`, `(modal)` — parens means they DON'T appear in URL but provide layout
- Auth guard via `<Redirect>` in a layout file — never with `useEffect + router.replace` in render
- Modals = `presentation: 'modal'` on `<Stack.Screen>`. Sheets = `@gorhom/bottom-sheet` (`u-sheet`)
- Typed routes via `experiments.typedRoutes` in `app.config.ts`

## When to load

Adding a route, restructuring nav stack, fixing deeplink, wiring auth guard, debugging back behavior.

---

## Folder layout

```
app/
  _layout.tsx              ← root: providers + Stack
  index.tsx                ← '/' splash / decide
  sign-in.tsx              ← '/sign-in' (public)
  (app)/
    _layout.tsx            ← auth guard, then Stack/Tabs
    (tabs)/
      _layout.tsx          ← Tabs config
      index.tsx            ← '/' (Home tab)
      orders/
        index.tsx          ← '/orders'
        [id].tsx           ← '/orders/123'
    settings.tsx           ← '/settings' (within app group, not in tabs)
  (modal)/
    _layout.tsx            ← modal Stack
    filter.tsx             ← '/filter' (modal)
```

`(app)` and `(tabs)` are groups — URLs don't include them.

---

## Imperative navigation

```tsx
import { useRouter } from 'expo-router';

const router = useRouter();
router.push('/orders'); // additive
router.push({ pathname: '/orders/[id]', params: { id: '123' } });
router.replace('/(app)/(tabs)'); // no back
router.back(); // pop
router.dismiss(); // close current modal/stack
router.dismissAll(); // pop to root of stack
```

## Declarative

```tsx
import { Link } from 'expo-router'
<Link href="/orders" className="text-primary-default">{t('home.see-orders')}</Link>
<Link href={{ pathname: '/orders/[id]', params: { id: order.id } }} asChild>
  <Pressable>...</Pressable>
</Link>
```

`asChild` lets a custom child receive the navigation handler (rather than rendering a default `<Text>`).

---

## Reading params

```tsx
import { useLocalSearchParams } from 'expo-router';
const { id } = useLocalSearchParams<{ id: string }>();
```

`useLocalSearchParams` returns the current screen's params. Use `useGlobalSearchParams` to read across all active screens (rare).

---

## Root layout

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';

export default function RootLayout() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  if (!isHydrated) return <SplashScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <ErrorBoundary>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="sign-in" />
                <Stack.Screen name="(app)" />
                <Stack.Screen name="(modal)" options={{ presentation: 'modal' }} />
              </Stack>
            </ErrorBoundary>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </I18nextProvider>
      <Toast />
    </GestureHandlerRootView>
  );
}
```

---

## Auth guard

```tsx
// app/(app)/_layout.tsx
import { Redirect, Stack } from 'expo-router';
import { useIsAuthenticated } from '@/lib/auth/auth-store';

export default function AppLayout() {
  const isAuthed = useIsAuthenticated();
  if (!isAuthed) return <Redirect href="/sign-in" />;
  return <Stack screenOptions={{ headerShown: true }} />;
}
```

`<Redirect>` is render-time. Don't use `useEffect + router.replace` — causes brief flash of protected content.

---

## Tabs layout

```tsx
// app/(app)/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2563eb' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <Ionicons name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders/index"
        options={{
          title: t('tabs.orders'),
          tabBarIcon: ({ color }) => <Ionicons name="receipt" color={color} />,
        }}
      />
    </Tabs>
  );
}
```

---

## Modal screen

```tsx
// app/(modal)/_layout.tsx
import { Stack } from 'expo-router';

export default function ModalLayout() {
  return <Stack screenOptions={{ presentation: 'modal' }} />;
}
```

```tsx
// open
router.push('/filter')

// inside modal screen:
<Stack.Screen options={{ headerLeft: () => <Button onPress={() => router.back()}>{t('common.cancel')}</Button> }} />
```

---

## Header config

```tsx
<Stack.Screen
  options={{
    title: t('orders.detail'),
    headerBackTitle: t('common.back'),
    headerRight: () => <IconButton icon="share" onPress={share} />,
    headerTransparent: false,
    animation: 'slide_from_right', // 'fade', 'slide_from_bottom', 'none'
  }}
/>
```

Configure inline in the screen — Expo Router applies on focus.

---

## Deeplinks

In `app.config.ts`:

```ts
ios:     { bundleIdentifier: 'com.unicorn.app' },
android: { package: 'com.unicorn.app', intentFilters: [...] },
scheme:  'unicorn',
```

URLs `unicorn://orders/123` resolve to `/orders/123` automatically (file-based). Universal links: configure `linking` in `app.config.ts` `ios.associatedDomains` and Android `intentFilters`.

Test in dev:

```bash
npx uri-scheme open unicorn://orders/123 --ios
```

---

## Typed routes

`app.config.ts`:

```ts
experiments: {
  typedRoutes: true;
}
```

Then `<Link href="/orders">` is type-checked. Run `npx expo customize` to regen types.

---

## Side-effects (toast / dialog / loading)

- Toast: `toast.success(msg)` (`u-rn-ui`)
- Confirm dialog: `Alert.alert(t('title'), t('msg'), [{ text: t('cancel') }, { text: t('ok'), onPress }])`
- Loading overlay: state-driven `<LoadingOverlay visible={isLoading} />` mounted in root layout

---

## Do / Don't

| ✅                                            | ❌                                     |
| --------------------------------------------- | -------------------------------------- |
| `<Redirect>` in layout for guard              | `useEffect + router.replace` in screen |
| `router.replace` after sign-in                | `router.push` (back button leaks)      |
| Typed routes enabled                          | Plain string routes                    |
| `useLocalSearchParams<T>()`                   | Cast `as any`                          |
| `presentation: 'modal'` for full-screen modal | bottom sheet for full flow             |
| Inline `<Stack.Screen options>`               | Imperative header mutation             |

---

## Common pitfalls

- **"Headers already sent"**: tried to render `<Stack.Screen options>` inside conditional. Lift it outside.
- **Back button does nothing**: used `router.replace` then expected back. Use `push` if you want history.
- **Modal won't close**: called `router.back()` from outside the modal's stack. Use `router.dismiss()`.
- **Param undefined on first render**: `useLocalSearchParams` returns `Partial<T>` — guard with `?.` or `enabled` on dependent queries.

---

## See also

- `u-screen` — `<ScreenContainer>`, header config inside screens
- `u-sheet` — when to choose sheet over modal
- `u-architecture` — route grouping rules
- `u-storage` — persisted last-route for resume
- `u-error-handling` — toast helpers
