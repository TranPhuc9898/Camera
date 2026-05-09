---
name: u-performance
description: 'Performance for RN — re-render measurement, list virtualization, image optimization, query cost, bundle size, JS thread vs UI thread, memory leaks. Triggers — performance, slow, lag, jank, FPS, re-render, memo, useShallow, FlashList, image, bundle size, memory leak.'
---

# u-performance — Perf Tuning

## TL;DR

- Measure first — Reanimated FPS monitor, React DevTools profiler, Flipper. Don't guess
- Lists: always FlashList with `estimatedItemSize`; never `ScrollView` for > 30 items
- Images: `expo-image` with `contentFit` + `transition` — never raw `<Image>` for remote URLs
- Re-render hygiene: `useShallow` for multi-field Zustand reads; `memo` only after profiling
- Animations: Reanimated worklet on UI thread; `runOnJS` only at boundaries
- Heavy work off the JS thread: InteractionManager, requestIdleCallback, or worklets
- Bundle: dynamic `import()` for rarely used screens; tree-shake icons

## When to load

User reports "slow", "laggy", FPS drop on a screen, large list jank, slow startup, memory growth, large APK/IPA.

---

## Measure before optimizing

| Tool                    | What it shows                    |
| ----------------------- | -------------------------------- |
| Reanimated FPS overlay  | UI / JS thread FPS at runtime    |
| React DevTools Profiler | Render counts, component costs   |
| Flipper                 | Network, layout, perf timeline   |
| `<Profiler>` API        | Custom render timing             |
| Sentry Performance      | Production transactions          |
| Hermes profiler         | JS thread bottlenecks (sampling) |

```ts
// quick re-render audit
import { Profiler } from 'react'

<Profiler id="OrderList" onRender={(id, phase, actualDuration) => {
  if (actualDuration > 16) log.warn('slow render', { id, phase, actualDuration })
}}>
  <OrderList />
</Profiler>
```

---

## List virtualization

```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={orders}
  renderItem={({ item }) => <OrderRow order={item} />}
  estimatedItemSize={72} // REQUIRED — measure once, hardcode
  keyExtractor={(o) => o.id}
  onEndReached={fetchNextPage}
  onEndReachedThreshold={0.5}
/>;
```

| Library                 | When                                               |
| ----------------------- | -------------------------------------------------- |
| `FlashList`             | Default for any list > 20 items                    |
| `FlatList`              | Built-in, fallback if FlashList integration breaks |
| `ScrollView`            | Static content < 30 items                          |
| `<Animated.ScrollView>` | Scroll-driven animations                           |

**Never** `data.map(...)` inside a `ScrollView` for dynamic data — no recycling, all items mount.

---

## Image optimization

```tsx
import { Image } from 'expo-image';

<Image
  source={{ uri: order.thumbnailUrl }}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
  placeholder={blurhash}
  recyclingKey={order.id} // recycle in lists
/>;
```

Rules:

- Always provide `placeholder` (blurhash from BE) — avoids layout shift
- `recyclingKey` matters in FlashList — without it, images flicker
- Avoid `Image.prefetch` on a list of 100 — fetch only what scrolls into view (FlashList does this)
- BE serves WebP / AVIF when possible

---

## Re-render hygiene

### Zustand selectors

```ts
// ❌ Subscribes to entire store — re-renders on any change
const store = useAuthStore();

// ✅ Single field
const userId = useAuthStore((s) => s.user?.id);

// ✅ Multi-field with shallow comparison
const { token, user } = useAuthStore(useShallow((s) => ({ token: s.token, user: s.user })));
```

### React.memo — only after profiling

```tsx
// Memo helps ONLY if:
// 1. Parent re-renders frequently
// 2. Props are stable (no inline objects/arrays/functions)
// 3. Render cost is measurable (> 1ms)

const OrderRow = memo(({ order }: Props) => { ... })

// ❌ Useless memo — onPress is new each render
<OrderRow order={o} onPress={() => doX(o)} />

// ✅ Stable callback
const handlePress = useCallback((o: Order) => doX(o), [])
<OrderRow order={o} onPress={handlePress} />
```

### useCallback / useMemo

Default: don't. Only when:

- Passed to `memo`'d child
- Used as dep in another hook
- Computation > 1ms

Premature `useCallback` adds GC pressure and obscures code.

---

## Animations on the UI thread

```tsx
import { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

const offset = useSharedValue(0);
const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

// All driven on UI thread — 60/120fps even if JS thread is busy
const onPress = () => {
  offset.value = withSpring(100);
};

// Cross thread: only when finishing
const onEnd = () => {
  offset.value = withSpring(0, undefined, () => runOnJS(notifyJS)());
};
```

Rules:

- Animation values: `useSharedValue`, never `useState`
- Styles: `useAnimatedStyle`, never `style={{ transform: [{ translateX: x }] }}` with state
- Cross-thread: `runOnJS` only on completion or rare events; never per-frame

---

## Heavy work off the JS thread

```ts
// After interactions complete — preserves animation FPS
InteractionManager.runAfterInteractions(() => {
  expensiveSetup()
})

// Idle callback (when JS thread free)
requestIdleCallback(() => { precomputeNextPage() })

// Worklet for parsing large structures (Reanimated)
const parseInWorklet = () => { 'worklet'; ... }
```

Rule: navigation transitions must NOT trigger expensive parse / network work — defer until after animation completes.

---

## Memory leaks

| Cause                           | Fix                                          |
| ------------------------------- | -------------------------------------------- |
| Listener not removed in cleanup | Return cleanup from `useEffect`              |
| `setInterval` without clear     | `clearInterval` in cleanup                   |
| Subscription persisted in store | Reset on sign-out                            |
| Image cache unbounded           | `Image.clearMemoryCache()` on memory warning |
| Closure captures large state    | Use ref for "latest value" pattern           |

```tsx
useEffect(() => {
  const sub = SomeEmitter.addListener(handler);
  return () => sub.remove(); // ALWAYS cleanup
}, []);
```

iOS memory warning:

```ts
import { AppState } from 'react-native';
AppState.addEventListener('memoryWarning', () => Image.clearMemoryCache());
```

---

## Query cost

```ts
// ❌ Refetches on every focus, even when data fresh
useGetOrders(filter, { refetchOnWindowFocus: 'always' });

// ✅ Stale time matches data volatility
useGetOrders(filter, { staleTime: 30_000 });

// ✅ Pagination, not full list
useGetOrdersInfinite(filter, { pageSize: 20 });
```

Rules:

- `staleTime` ≥ 5s for tap-friendly endpoints (avoid double-tap re-fetch)
- `gcTime` long enough to support back-navigation feel snappy (default 5min OK)
- Selector for narrow re-render: `select: (data) => data.summary`

---

## Bundle size

```bash
# Hermes shipped bytecode size
npx expo export --platform android
ls -lh dist/_expo/static/js/android/*.hbc

# JS bundle visualizer
npx react-native-bundle-visualizer
```

Reduce:

- Dynamic imports for rarely used screens:
  ```tsx
  const Heavy = lazy(() => import('@/features/heavy/heavy-screen'));
  ```
- Tree-shake icons: import individually, never the whole pack
- Audit `node_modules` size: `npx pkg-size` — flag deps > 500kb minified
- Drop unused locales (moment, dayjs, intl-messageformat)

---

## Startup performance

| Knob                                   | Effect                                               |
| -------------------------------------- | ---------------------------------------------------- |
| Hermes (RN default)                    | Faster JS load                                       |
| `unstable_legacyImplementation` off    | Modern bridgeless mode                               |
| Splash screen kept until first content | Hides any layout shift                               |
| Defer non-critical providers           | Auth → splash gate; analytics initialized post-mount |
| `expo-router` typed routes             | Smaller route table                                  |

```ts
// Preload critical fonts before splash hide
await Font.loadAsync({ ... })
await SplashScreen.hideAsync()
```

Target: < 2.5s cold start on mid-range Android.

---

## Profiling tips

```ts
// Mark transactions for Sentry
import * as Sentry from '@sentry/react-native';

Sentry.startSpan({ name: 'orders.list.render', op: 'ui' }, () => {
  // measured block
});
```

Profile in **release mode** — debug JS is much slower, misleading. `npx expo run:ios --variant Release`.

---

## Do / Don't

| ✅                                           | ❌                            |
| -------------------------------------------- | ----------------------------- |
| Measure first                                | Optimize blindly              |
| FlashList for any > 20 items                 | `ScrollView` + `.map`         |
| `expo-image` w/ placeholder                  | Raw `<Image>` for remote      |
| `useShallow` for multi-field reads           | `useStore()` (full subscribe) |
| Reanimated worklets on UI thread             | `useState`-driven animations  |
| Defer post-mount work via InteractionManager | Heavy parse during navigation |
| Cleanup listeners                            | Forget cleanup                |

---

## Common pitfalls

- **Inline object as `style={{}}`** — new ref each render, breaks memo. Hoist or use `StyleSheet`.
- **`useCallback` with bad deps** — stale closure; reads old state. Match deps exactly.
- **`useMemo` returning unstable ref** — wraps `{ ... }` literal each render anyway.
- **`memo` on always-re-rendering children** — measure parent re-render first.
- **`flatListRef.scrollToIndex` on FlashList** — different API; use `scrollToOffset`.
- **Massive `select` in TanStack** — runs every render. Memoize selector or simplify.
- **Profiling in dev mode** — debug JS is 5–10× slower; profile in Release.

---

## See also

- `u-rn-ui` — FlashList, expo-image, Reanimated patterns
- `u-controller` — Zustand selector / useShallow
- `u-usecase` — TanStack staleTime / select
- `u-codegen` — bundle analysis scripts
