---
name: u-sheet
description: 'Bottom sheets via @gorhom/bottom-sheet — present/dismiss, snap points, dynamic height, backdrop, keyboard handling. Triggers — bottom sheet, sheet, modal sheet, snap points, gorhom, BottomSheetModal, sheet vs modal, dismiss sheet.'
---

# u-sheet — Bottom Sheets (gorhom)

## TL;DR

- All bottom sheets use `@gorhom/bottom-sheet` v5
- File pattern: `src/features/<f>/components/<name>-sheet.tsx`
- Use `<BottomSheetModal>` (imperative open/close) — NOT `<BottomSheet>` (declarative, wrong for triggered UI)
- Wrap app once with `<BottomSheetModalProvider>` in `app/_layout.tsx`
- One ref per sheet; expose `present()` / `dismiss()` via `forwardRef` + `useImperativeHandle`
- For sheet-as-route (deeplinkable), use Expo Router `presentation: 'modal'` instead

## When to load

Adding/editing any bottom sheet — filters, action menus, item details, picker.

---

## Decision: sheet or modal?

| Need                              | Use                                                   |
| --------------------------------- | ----------------------------------------------------- |
| Quick action menu, filter, picker | Bottom sheet (this)                                   |
| Multi-step or full-page flow      | Stack screen `presentation: 'modal'` (`u-navigation`) |
| Confirmation dialog               | Native `Alert.alert`                                  |
| Toast                             | `toast.error/success`                                 |

Sheet = lightweight, transient, dismissable by drag. Modal = navigation-routable, has its own header.

---

## App-level provider

```tsx
// app/_layout.tsx
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <BottomSheetModalProvider>
      <Stack />
    </BottomSheetModalProvider>
  </GestureHandlerRootView>
);
```

`BottomSheetModalProvider` MUST be inside `GestureHandlerRootView`.

---

## Sheet template (with imperative ref)

```tsx
// src/features/orders/components/order-filter-sheet.tsx
import { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';

export interface OrderFilterSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface Props {
  onApply: (filter: OrderFilter) => void;
}

export const OrderFilterSheet = forwardRef<OrderFilterSheetRef, Props>(function OrderFilterSheet(
  { onApply },
  ref,
) {
  const sheetRef = useRef<BottomSheetModal>(null);

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['50%', '90%']}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: 'transparent' }}
    >
      <BottomSheetView className="bg-background-elevated rounded-t-2xl px-md pb-xl pt-md">
        <Text className="text-text-primary mb-md text-lg font-semibold">{t('orders.filter')}</Text>
        {/* filter UI */}
        <Button
          onPress={() => {
            onApply(filter);
            sheetRef.current?.dismiss();
          }}
        >
          {t('common.apply')}
        </Button>
      </BottomSheetView>
    </BottomSheetModal>
  );
});
```

---

## Caller pattern

```tsx
const sheetRef = useRef<OrderFilterSheetRef>(null);

return (
  <>
    <Button onPress={() => sheetRef.current?.present()}>{t('orders.filter')}</Button>
    <OrderFilterSheet ref={sheetRef} onApply={setFilter} />
  </>
);
```

Sheet sits at the screen root — not conditionally rendered. Only its `present/dismiss` is imperative.

---

## Snap points

```tsx
snapPoints={['25%', '50%', '90%']}    // discrete heights
```

- Use percentages for content-agnostic ratios
- Use absolute (`[300]`) when content is fixed pixel
- Keep ≤3 snap points — more is rarely useful

For content-fitting:

```tsx
enableDynamicSizing={true}
// no snapPoints needed — sheet sizes to content
```

---

## Keyboard handling

For sheets with text input (forms):

```tsx
<BottomSheetModal
  keyboardBehavior="interactive"     // adjusts on keyboard show
  keyboardBlurBehavior="restore"     // returns to original snap on blur
  android_keyboardInputMode="adjustResize"
>
```

Use `<BottomSheetTextInput>` instead of plain `<TextInput>` to integrate with sheet's gesture handling.

---

## ScrollView inside

Use `<BottomSheetScrollView>` (NOT `ScrollView`) so scroll gestures don't fight with drag-to-dismiss:

```tsx
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
<BottomSheetScrollView contentContainerClassName="px-md pb-xl">
  {/* long content */}
</BottomSheetScrollView>;
```

For lists: `<BottomSheetFlatList>`.

---

## Dismiss-on-action

Always dismiss explicitly after the user's action — never rely on parent state:

```tsx
onPress={() => {
  onApply(filter)
  sheetRef.current?.dismiss()
}}
```

For multi-step, navigate within the sheet by swapping content based on local state, not by chaining sheets.

---

## Do / Don't

| ✅                                         | ❌                                   |
| ------------------------------------------ | ------------------------------------ |
| `<BottomSheetModal>` + ref                 | `<BottomSheet>` declarative          |
| `BottomSheetModalProvider` at root         | Provider per screen                  |
| `<BottomSheetScrollView>` for long content | RN `<ScrollView>` (gesture conflict) |
| Memo `renderBackdrop`                      | Inline arrow each render             |
| Dismiss after action                       | Wait for parent unmount              |
| ≤3 snap points                             | 5+ snap points                       |

---

## Common pitfalls

- **Sheet doesn't open**: provider missing or not inside `GestureHandlerRootView`.
- **Drag conflicts with scroll**: using RN `<ScrollView>` instead of `<BottomSheetScrollView>`.
- **Keyboard covers input**: missing `keyboardBehavior` / using plain `<TextInput>`.
- **Backdrop doesn't close**: missing `pressBehavior="close"` on `<BottomSheetBackdrop>`.

---

## See also

- `u-rn-ui` — gesture-handler wrapping (root provider)
- `u-form` — forms inside sheets use `<BottomSheetTextInput>`
- `u-navigation` — modal route alternative
- `u-codegen` — `npx plop sheet`
