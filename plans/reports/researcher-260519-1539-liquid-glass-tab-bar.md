# Liquid Glass Tab Bar in Expo Router v6 — Research Report

**Date:** 2026-05-19 | **Topic:** Building iOS 26 liquid glass tab bars in Expo React Native  
**Recommendation:** Use `NativeTabs` from `expo-router/unstable-native-tabs` for automatic liquid glass; fallback to custom `Tabs` + `GlassView` only if you need total UI control.

---

## 1. **expo-glass-effect Package API**

**Import:**

```tsx
import {
  GlassView,
  GlassContainer,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';
```

**GlassView Props:**

- `colorScheme?: 'auto' | 'light' | 'dark'` — auto-detects or forces theme
- `glassEffectStyle?: 'clear' | 'regular' | 'none'` (or config object with `animate`, `animationDuration`)
- `isInteractive?: boolean` (default: false)
- `tintColor?: string` — tint overlay
- Standard `ViewProps` inherited

**Key Methods:**

- `isLiquidGlassAvailable()` → `boolean` — "indicates if app uses Liquid Glass design"
- `isGlassEffectAPIAvailable()` → `boolean` — checks if device supports at **runtime** (catches iOS 26 beta crashes)

**SDK Version:** Introduced in **Expo SDK 54** (latest: 55.0.11 on npm).

---

## 2. **NativeTabs vs Custom Tabs**

### **Option A: NativeTabs (RECOMMENDED)**

**Import:**

```tsx
import { NativeTabs } from 'expo-router/unstable-native-tabs';
```

**Components:**

- `<NativeTabs>` — root container
- `<NativeTabs.Trigger name="...">` — individual tab
  - `<NativeTabs.Trigger.Label>` — text
  - `<NativeTabs.Trigger.Icon sf="..." md="..." />` — SF Symbols (iOS) or Material (Android)
  - `<NativeTabs.Trigger.Badge>` — notification badge
- `<NativeTabs.BottomAccessory>` — floating view above bar (SDK 55+)

**Liquid Glass on iOS 26:**
✅ **YES — automatic.** `NativeTabs` uses native `UITabBarController`. On iOS 26, tabs render with liquid glass automatically. On iOS 18–, they render traditional iOS tab style. On Android, Material 3.

**Minimal Example:**

```tsx
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}
```

### **Option B: Custom Tabs + GlassView (fallback)**

For full UI control, wrap a custom `Tabs` bar with `GlassView`:

```tsx
import { Tabs } from 'expo-router';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';

export default function TabLayout() {
  const glassAvailable = isGlassEffectAPIAvailable();

  const TabBar = (props) => {
    const Wrapper = glassAvailable ? GlassView : Platform.OS === 'android' ? BlurView : View;

    return <Wrapper glassEffectStyle="regular">{/* Your custom tab bar JSX */}</Wrapper>;
  };

  return <Tabs tabBar={TabBar} />;
}
```

---

## 3. **Platform Support & Fallback Behavior**

| Platform      | Liquid Glass                            | Fallback                    | Notes                                  |
| ------------- | --------------------------------------- | --------------------------- | -------------------------------------- |
| **iOS 26+**   | ✅ Full support (GlassView, NativeTabs) | N/A                         | Real liquid glass effect               |
| **iOS 18–25** | ❌ GlassView returns regular View       | Transparent or opaque View  | NativeTabs renders traditional tab bar |
| **iOS <18**   | ❌ Not supported                        | Regular View                | Use solid background                   |
| **Android**   | ❌ Not supported                        | Regular View or `expo-blur` | NativeTabs uses Material 3             |

**Detection:**

- `isGlassEffectAPIAvailable()` — safe at runtime; returns `false` on iOS 26 beta builds without the API
- `isLiquidGlassAvailable()` — indicates if app is using Liquid Glass design (app-level flag)

---

## 4. **Build & Config Requirements**

| Requirement       | Status              | Notes                                                           |
| ----------------- | ------------------- | --------------------------------------------------------------- |
| **Expo Go**       | ❌ Not supported    | Must use dev client or prebuild                                 |
| **Dev Client**    | ✅ Required         | `expo-dev-client` installed; `eas build --profile development`  |
| **Prebuild**      | ✅ Required for EAS | `npx expo prebuild` modifies native iOS project                 |
| **Config Plugin** | ⚠️ Auto-included    | `expo-glass-effect` has built-in plugin; no manual setup needed |

**Minimum SDK:** Expo SDK 54 (glass-effect + native-tabs beta).  
**Status:** `NativeTabs` marked `unstable-native-tabs` (beta API subject to change, use in SDK 55+).

---

## 5. **Known Gotchas & Common Mistakes**

### **Dark Mode Flicker (iOS 26)**

Header buttons with liquid glass may flash background when switching tabs.  
**Fix:** Wrap layout with `ThemeProvider` using `DarkTheme` / `DefaultTheme` from `@react-navigation/native`.

### **Icon Display Bugs (NativeTabs)**

Icons fail to render in dev client builds (SDK 54–55).  
**Workaround:** Ensure SF Symbols (iOS) or Material icons (Android); avoid custom vector assets.

### **Badge Cropping (NativeTabs + Badge)**

Badge in search-role trigger visually cropped.  
**Status:** Known issue, no current workaround.

### **Transparent Tab Bar on Scroll (iOS 18–)**

Native tab bar becomes transparent when scrolling content to end.  
**Mitigation:** Use `disableTransparentOnScrollEdge` prop (if available).

### **Color Styling Issues**

Dark mode tab bar ignores `backgroundColor`, `iconColor` config.  
**Root cause:** React Navigation default theme mismatch.  
**Fix:** Explicitly set `ThemeProvider` theme matching system dark mode.

### **No Fallback to Custom Rendering**

With `NativeTabs`, you cannot pass a custom `tabBar` prop—you get iOS tab bar or nothing.  
**If custom UI needed:** Stick to JS `Tabs` + `GlassView` wrapper (lose native liquid glass).

### **Mixing Tabs & NativeTabs**

Combining `<Tabs>` and `<NativeTabs>` in same router tree crashes.  
**Rule:** Use one or the other, not both.

---

## Recommendation

**Use `NativeTabs`** if:

- You want automatic liquid glass on iOS 26 with zero effort
- Standard icon + label tab bar acceptable
- Testing on dev client or physical device (not Expo Go)

**Use custom Tabs + GlassView** if:

- You need full bar customization (animations, custom layouts)
- Icon display bugs in NativeTabs are deal-breakers
- You're willing to manage fallbacks manually

---

## Unresolved Questions

1. Does `isLiquidGlassAvailable()` return different values on iOS vs Android, or only on iOS 26+?
2. Exact timeline for `unstable-native-tabs` API stabilization (currently SDK 55)?
3. Does `ThemeProvider` fix still needed in SDK 55 native tabs?

---

## Sources

- [GlassEffect - Expo Documentation](https://docs.expo.dev/versions/latest/sdk/glass-effect/)
- [Native Tabs - Expo Documentation](https://docs.expo.dev/router/advanced/native-tabs/)
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54)
- [Start using Liquid Glass in your React Native + Expo Apps — Medium](https://medium.com/@jordibeltranq/start-using-liquid-glass-in-your-react-native-expo-apps-ceb03e26ffdf)
- [The iOS Liquid Glass Tab Bar Finally Came to Expo](https://www.amillionmonkeys.co.uk/blog/expo-liquid-glass-tab-bar-ios)
