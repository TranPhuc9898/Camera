---
name: u-accessibility
description: 'Accessibility for RN — WCAG AA target, accessibilityLabel, role, state, touch targets, contrast, reduced motion, screen reader testing. Triggers — accessibility, a11y, WCAG, screen reader, VoiceOver, TalkBack, accessibilityLabel, contrast, touch target, reduced motion.'
---

# u-accessibility — A11y for RN

## TL;DR

- Target **WCAG 2.1 AA** — applies to text contrast, target size, motion
- Every Pressable/TextInput needs `accessibilityLabel` (i18n key, not raw English)
- Touch target ≥ 44×44 pt (iOS HIG); use `hitSlop` if visual is smaller
- Text contrast ratio ≥ 4.5:1 normal, ≥ 3:1 large; check via design tokens
- Respect `useReducedMotion()` from `react-native-reanimated` — disable animations
- Test with VoiceOver (iOS) + TalkBack (Android) before shipping
- DO NOT use `accessibilityLabel` for visual decoration; mark with `accessible={false}` instead

## When to load

Adding interactive components, audit pass before release, fixing a11y bug, implementing dark mode (contrast revalidation), reduced-motion variant.

---

## Required props by element

| Element             | Required props                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Pressable / Button  | `accessibilityRole="button"`, `accessibilityLabel`, `accessibilityState={{ disabled, busy }}` |
| TextInput           | `accessibilityLabel` (label text), `accessibilityHint` if non-obvious                         |
| Switch / Checkbox   | `accessibilityRole="switch"`/"checkbox", `accessibilityState={{ checked }}`                   |
| Image (informative) | `accessibilityLabel` describing content; `accessibilityRole="image"`                          |
| Image (decorative)  | `accessible={false}`                                                                          |
| Heading             | `accessibilityRole="header"`                                                                  |
| Tab                 | `accessibilityRole="tab"`, `accessibilityState={{ selected }}`                                |
| Link (in-app nav)   | `accessibilityRole="link"`                                                                    |

---

## Label, hint, role, state

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel={t('orders.cancel-cta-label')}
  accessibilityHint={t('orders.cancel-cta-hint')} // optional, action result
  accessibilityState={{ disabled: !canCancel, busy: cancelling }}
  onPress={onCancel}
>
  <Text>{t('orders.cancel')}</Text>
</Pressable>
```

- **Label** = WHAT the element is ("Cancel order")
- **Hint** = what happens if activated ("Cancels the selected order")
- **Role** = type of element ("button")
- **State** = current state ({ disabled, selected, checked, busy, expanded })

---

## Touch targets

```tsx
// Visual is 24×24, real touch must be 44×44
<Pressable hitSlop={10} onPress={...}>
  <Icon name="close" size={24} />
</Pressable>
```

Lint rule (custom): warn on `Pressable` whose direct child has explicit `width`/`height` < 44 without `hitSlop`.

---

## Color contrast

Bake into design tokens — no per-component contrast checks.

| Token pair                                       | Min ratio | Use                     |
| ------------------------------------------------ | --------- | ----------------------- |
| `text-text-primary` on `bg-background-default`   | 7:1       | Body text               |
| `text-text-secondary` on `bg-background-default` | 4.5:1     | Captions                |
| `text-text-on-primary` on `bg-primary-default`   | 4.5:1     | CTA labels              |
| Disabled text                                    | 3:1       | Allowed (informational) |

Verify via Storybook color-tokens story + `wcag-contrast` library check in CI:

```ts
expect(contrastRatio('#1A1A1A', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
```

---

## Reduced motion

```tsx
import { useReducedMotion } from 'react-native-reanimated';

function Toast() {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: reducedMotion ? 0 : 200 });
  }, [reducedMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={style}>...</Animated.View>;
}
```

Rule: any animation > 100ms or that pulses/flashes must respect reduced motion.

---

## Dynamic type (font scaling)

iOS users can enlarge system font. Default RN respects it; pitfalls:

```tsx
// ❌ Caps font scale arbitrarily — breaks accessibility
<Text allowFontScaling={false}>Title</Text>

// ✅ Allow scaling but cap maximum to avoid layout breakage
<Text maxFontSizeMultiplier={1.5}>Title</Text>
```

Test at **largest** Dynamic Type setting → no truncation, no cut-off CTAs.

---

## Screen reader patterns

### Group related text

```tsx
// ❌ VoiceOver reads "Order. ABC123. Pending. 2 items"
<View>
  <Text>{t('orders.label')}</Text>
  <Text>{order.code}</Text>
  <Text>{order.status}</Text>
</View>

// ✅ One announcement
<View accessible accessibilityLabel={t('orders.row-label', { code: order.code, status: order.status })}>
  <Text>{t('orders.label')}</Text>
  <Text>{order.code}</Text>
  <Text>{order.status}</Text>
</View>
```

### Live regions

```tsx
<View accessibilityLiveRegion="polite">{error && <Text>{error}</Text>}</View>
```

Use `polite` for status, `assertive` only for blocking errors (rare).

### Focus management

```tsx
import { findNodeHandle, AccessibilityInfo } from 'react-native';
const ref = useRef(null);
useEffect(() => {
  const tag = findNodeHandle(ref.current);
  if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
}, []);
```

Use after navigation to focus the screen header for orientation.

---

## i18n + a11y

Labels MUST be translated keys, not hardcoded English:

```tsx
// ❌ English-only
accessibilityLabel="Cancel order"

// ✅ i18n
accessibilityLabel={t('orders.cancel-cta-label')}
```

Add a11y namespace per feature: `orders/a11y.ts` with all label/hint keys.

---

## Testing

| Tool                                                 | What it catches               |
| ---------------------------------------------------- | ----------------------------- |
| VoiceOver (iOS Settings → Accessibility → VoiceOver) | Real screen-reader experience |
| TalkBack (Android Settings → Accessibility)          | Android equivalent            |
| Accessibility Inspector (Xcode)                      | Element tree, missing labels  |
| Accessibility Scanner (Google Play)                  | Touch targets, contrast       |
| `eslint-plugin-react-native-a11y`                    | Static checks (missing label) |

Manual smoke test before release: enable VoiceOver, navigate the 3 critical flows.

---

## Do / Don't

| ✅                                                | ❌                                       |
| ------------------------------------------------- | ---------------------------------------- |
| `accessibilityLabel` on every interactive element | "Screen reader users will figure it out" |
| `hitSlop` for small visuals                       | 24×24 button without hitSlop             |
| Group related text under one `accessible` parent  | Each Text individually announced         |
| Respect `useReducedMotion`                        | Pulse / flash animations always on       |
| Test with VoiceOver + TalkBack                    | Test only with sighted eyes              |
| Translate a11y labels via i18n                    | Hardcode English                         |

---

## Common pitfalls

- **Icon-only button without label**: VoiceOver reads "button" — useless. Always label.
- **`accessibilityRole="button"` on a Text**: doesn't make it tappable. Wrap in Pressable.
- **Decorative image announced**: forgot `accessible={false}`.
- **Animation respects reducedMotion only on iOS**: Reanimated handles both — use the hook.
- **Custom Switch without role**: VoiceOver reads "selected/unselected" instead of "on/off". Set `accessibilityRole="switch"`.
- **Modal overlay without focus trap**: VoiceOver reads background content. Use modal route group + correct semantics.

---

## See also

- `u-rn-ui` — primitives wire a11y props at the source
- `u-design-system` — contrast bakes into tokens
- `u-i18n` — labels live in translation files
- `u-verify` — testIDs distinct from a11y labels (don't confuse)
