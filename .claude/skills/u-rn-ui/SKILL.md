---
name: u-rn-ui
description: 'RN UI patterns — Reanimated 4, gesture-handler v2, expo-image, FlashList, skeletons, modals/toasts, SVG icons, keyboard handling. Triggers — animation, reanimated, gesture, swipe, FlashList, image, expo-image, skeleton, modal, toast, icon, SVG, keyboard, scroll, list.'
---

# u-rn-ui — Animations, Gestures, Lists, Media

## TL;DR

- Animations: **react-native-reanimated 4** (`useSharedValue`, `useAnimatedStyle`, `withTiming/withSpring`)
- Gestures: **react-native-gesture-handler v2** (`Gesture.Pan/Tap/LongPress`, `<GestureDetector>`)
- Lists: **FlashList** (`@shopify/flash-list`) — `estimatedItemSize` is REQUIRED
- Images: **expo-image** with `contentFit`, `transition`, `placeholder`
- Icons: **@expo/vector-icons** for stock; SVG via **react-native-svg** for custom
- Modals → `<Stack.Screen presentation="modal">`. Bottom sheets → `@gorhom/bottom-sheet` (`u-sheet`)
- Toasts via lightweight singleton — see template below

## When to load

Adding/editing any of: animation, gesture, list, image, skeleton, toast, icon, keyboard interaction.

---

## Reanimated 4 — basics

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

export function FadeIn({ children }: { children: ReactNode }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 240 });
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
```

**Rules:**

- Mutate `.value` only — never replace the whole shared value
- `useAnimatedStyle` runs on UI thread — do NOT call hooks/setState inside
- For derived: `useDerivedValue(() => sv.value * 2)` (UI-thread)
- Spring for natural motion, timing for predictable

---

## Gesture handler v2

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

const tap = Gesture.Tap().onEnd(() => runOnJS(setOpen)(true));
const pan = Gesture.Pan()
  .onUpdate((e) => {
    translateX.value = e.translationX;
  })
  .onEnd(() => {
    translateX.value = withSpring(0);
  });

return (
  <GestureDetector gesture={Gesture.Race(tap, pan)}>
    <Animated.View style={animStyle}>{children}</Animated.View>
  </GestureDetector>
);
```

`runOnJS(...)` to call JS-thread code (setState, navigate) from a gesture callback.

Wrap app once at root: `<GestureHandlerRootView style={{ flex: 1 }}>` in `app/_layout.tsx`.

---

## FlashList

```tsx
import { FlashList } from '@shopify/flash-list'

<FlashList
  data={orders}
  keyExtractor={(o) => o.id}
  estimatedItemSize={80}                 // REQUIRED
  renderItem={({ item }) => <OrderRow order={item} />}
  ItemSeparatorComponent={Separator}
  ListEmptyComponent={<EmptyState ... />}
  onEndReached={() => fetchNextPage()}
  onEndReachedThreshold={0.5}
  refreshing={isRefetching}
  onRefresh={refetch}
/>
```

**Performance rules:**

- Memo `renderItem` if item is heavy (`React.memo` the row component)
- Stable `keyExtractor` (use a real id, not index)
- Stable `data` reference (don't `.map` inside render)

Avoid plain `FlatList` unless list is <20 items. `ScrollView` ONLY for non-list content.

---

## expo-image

```tsx
import { Image } from 'expo-image';

<Image
  source={{ uri: order.thumbnail }}
  placeholder={blurhash}
  contentFit="cover"
  transition={150}
  className="h-48 w-full rounded-md"
/>;
```

Always set `contentFit` (`cover` | `contain` | `fill`). Always set `placeholder` for above-the-fold images. Cache is automatic (memory + disk).

---

## SVG icons

Stock icons:

```tsx
import { Ionicons } from '@expo/vector-icons';
<Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />;
```

Custom SVG: drop `.svg` into `assets/icons/`, import with svg loader (configured in `metro.config.js`):

```tsx
import LogoIcon from '@/assets/icons/logo.svg';
<LogoIcon width={32} height={32} />;
```

---

## Skeleton

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export function Skeleton({ className }: { className?: string }) {
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={style} className={`bg-surface-muted rounded-md ${className}`} />;
}
```

Compose into screen-specific skeleton:

```tsx
<View className="gap-md">
  <Skeleton className="h-8 w-1/2" />
  <Skeleton className="h-24 w-full" />
</View>
```

---

## Toast singleton

```tsx
// src/lib/ui/toast.tsx
import Toast from 'react-native-toast-message';

export const toast = {
  success: (msg: string) => Toast.show({ type: 'success', text1: msg }),
  error: (msg: string) => Toast.show({ type: 'error', text1: msg }),
  info: (msg: string) => Toast.show({ type: 'info', text1: msg }),
};
```

Mount once: `<Toast />` at end of `app/_layout.tsx`. Then `toast.error(errorMessage(t, err))` from anywhere.

---

## Keyboard handling

Use `<KeyboardAvoidingView behavior="padding">` (iOS) or `"height"` (Android) — already wired in `<ScreenContainer keyboardAvoiding>`.

For dismissing on outside tap:

```tsx
import { Keyboard, TouchableWithoutFeedback } from 'react-native';
<TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
  <View>{children}</View>
</TouchableWithoutFeedback>;
```

For input scroll-into-view in long forms: use `react-native-keyboard-aware-scroll-view`.

---

## Pitfalls

- **`useEffect` mutating `.value`** without deps array → infinite loop. Always set deps.
- **`runOnJS` missing** → "Tried to synchronously call function from a different thread."
- **FlashList without `estimatedItemSize`** → bad perf, console warning.
- **Inline arrow `renderItem`** → re-renders every parent change. Memo or hoist.
- **`Animated.View` from `react-native`** instead of `react-native-reanimated` → silent failure.

---

## Do / Don't

| ✅                                             | ❌                                     |
| ---------------------------------------------- | -------------------------------------- |
| `Animated.View` from `react-native-reanimated` | from `react-native`                    |
| `Gesture.Pan().onEnd(() => runOnJS(fn)())`     | call JS function directly from worklet |
| FlashList + `estimatedItemSize`                | FlatList for large lists               |
| `expo-image` + `contentFit`                    | RN `<Image>` for content               |
| Memo row components                            | Inline `renderItem={item => <Big />}`  |

---

## See also

- `u-screen` — `<ScreenContainer>`, layout
- `u-design-system` — tokens for animation duration / radius / colors
- `u-performance` — measuring rerender cost
- `u-sheet` — bottom sheet (gorhom) vs modal
- `u-accessibility` — animation prefers-reduced-motion
