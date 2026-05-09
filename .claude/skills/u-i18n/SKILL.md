---
name: u-i18n
description: 'i18next + expo-localization. JSON keys in vi.json + en.json (parity required), useTranslation, interpolation, plurals, type-safe keys, language switcher with persist. Triggers — i18n, translation, localization, t key, useTranslation, i18next, vi.json, en.json, language, locale, plural, interpolation.'
---

# u-i18n — Localization (i18next)

## TL;DR

- Two locales today: `en`, `vi` — every key MUST exist in BOTH JSON files
- Keys live in `src/translations/<locale>.json`, organized by feature (`orders.title`, `auth.sign-in`)
- Read with `const { t } = useTranslation()` and `t('orders.title')`
- Locale resolution: `expo-localization` device default → `useSettingsStore.language` override
- Persisted via `useSettingsStore` (Zustand + MMKV)
- Run `npm run i18n:check` before commit — fails if keys diverge
- Type-safe keys via `i18next.d.ts` augmentation

## When to load

Adding a key, switching languages, fixing missing translation, debugging plural form, designing a new feature's key namespace.

---

## File map

```
src/translations/
  en.json
  vi.json
src/lib/i18n/
  index.ts              ← i18next init + provider
  error-message.ts      ← errorMessage(t, err) helper (see u-error-handling)
  i18next.d.ts          ← module augmentation for type-safe keys
scripts/i18n-parity-check.js
```

---

## i18next init

```ts
// src/lib/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from '@/translations/en.json';
import vi from '@/translations/vi.json';
import { storage, StorageKeys } from '@/lib/storage/mmkv';

const stored = storage.getString(StorageKeys.language);
const device = Localization.getLocales()[0]?.languageCode ?? 'en';
const initial = stored ?? (device === 'vi' ? 'vi' : 'en');

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, vi: { translation: vi } },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export { i18n };
```

Mount provider in `app/_layout.tsx`:

```tsx
<I18nextProvider i18n={i18n}>
  <Stack />
</I18nextProvider>
```

---

## Key naming convention

```jsonc
// src/translations/en.json
{
  "common": {
    "back": "Back",
    "cancel": "Cancel",
    "save": "Save",
    "loading": "Loading…",
  },
  "auth": {
    "sign-in": "Sign in",
    "email": "Email",
    "password": "Password",
    "session-expired": "Your session has expired. Please sign in again.",
  },
  "orders": {
    "title": "Orders",
    "empty": "No orders yet",
    "filter": "Filter",
    "items-count_one": "{{count}} item",
    "items-count_other": "{{count}} items",
  },
  "error": {
    "network": "No internet connection",
    "timeout": "Request timed out",
    "server": "Server error, try again",
    "unknown": "Something went wrong",
  },
  "form": {
    "required": "Required",
    "email-invalid": "Invalid email",
    "password-too-short": "Password must be at least 8 characters",
  },
}
```

**Rules:**

- Top-level namespace = feature folder name (`orders`, `auth`) OR cross-cutting category (`common`, `error`, `form`)
- Keys are kebab-case
- Plurals use `_one` / `_other` suffix (i18next auto-resolves with `count`)

---

## Reading

```tsx
import { useTranslation } from 'react-i18next';

function OrderListScreen() {
  const { t } = useTranslation();
  return <Text>{t('orders.title')}</Text>;
}
```

### Interpolation

```tsx
t('orders.welcome', { name: user.displayName });
// JSON: "welcome": "Hello {{name}}"
```

### Plural

```tsx
t('orders.items-count', { count: orders.length });
// JSON: "items-count_one": "{{count}} item", "items-count_other": "{{count}} items"
```

### Outside React

```ts
import { i18n } from '@/lib/i18n';
i18n.t('error.network'); // for non-component code (interceptors, etc.)
```

---

## Language switcher

```ts
// src/lib/settings/settings-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvJSONStorage } from '@/lib/storage/mmkv';
import { i18n } from '@/lib/i18n';

interface SettingsState {
  language: 'en' | 'vi';
  setLanguage: (l: 'en' | 'vi') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => {
        i18n.changeLanguage(language);
        set({ language });
      },
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => mmkvJSONStorage),
      version: 1,
      migrate: (s) => s,
    },
  ),
);
```

UI:

```tsx
const setLanguage = useSettingsStore((s) => s.setLanguage)
<Button onPress={() => setLanguage('vi')}>Tiếng Việt</Button>
```

---

## Type-safe keys

```ts
// src/lib/i18n/i18next.d.ts
import 'i18next';
import en from '@/translations/en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
  }
}
```

Now `t('foo.bar')` is autocompleted, and `t('does.not.exist')` is a TS error.

---

## Parity script

```js
// scripts/i18n-parity-check.js
const fs = require('fs');

const en = JSON.parse(fs.readFileSync('src/translations/en.json', 'utf8'));
const vi = JSON.parse(fs.readFileSync('src/translations/vi.json', 'utf8'));

function flatten(obj, prefix = '') {
  return Object.keys(obj).flatMap((k) =>
    typeof obj[k] === 'object' ? flatten(obj[k], `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

const enKeys = new Set(flatten(en));
const viKeys = new Set(flatten(vi));
const onlyEn = [...enKeys].filter((k) => !viKeys.has(k));
const onlyVi = [...viKeys].filter((k) => !enKeys.has(k));

if (onlyEn.length || onlyVi.length) {
  console.error('i18n parity check FAILED');
  if (onlyEn.length) console.error('Missing in vi.json:', onlyEn);
  if (onlyVi.length) console.error('Missing in en.json:', onlyVi);
  process.exit(1);
}
console.log('i18n parity OK');
```

Run: `npm run i18n:check`. Wire to pre-commit hook + CI.

---

## Formatting (numbers / dates)

Use built-in `Intl` (RN supports it on iOS 14+ / Android 13+; ship `expo-build-properties` polyfill if older):

```ts
new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date());
```

For complex date math: use `dayjs` with `import 'dayjs/locale/vi'`.

---

## Do / Don't

| ✅                                      | ❌                                        |
| --------------------------------------- | ----------------------------------------- |
| `t('feature.key')`                      | Inline literal `'Hello'`                  |
| Add key to BOTH `en.json` and `vi.json` | Add to one, ship                          |
| Plurals via `_one` / `_other`           | `count === 1 ? 'item' : 'items'`          |
| `npm run i18n:check` before commit      | Trust manual sync                         |
| `i18n.changeLanguage` in store action   | Set language only in JSON, forget i18next |
| Namespace by feature (`orders.x`)       | Flat key (`orderTitle`)                   |

---

## Common pitfalls

- **Key shows raw**: missing in current locale. Run parity check.
- **Plural prints `_one` literal**: forgot `count` parameter.
- **Language doesn't persist**: forgot `persist` middleware on settings store.
- **Date formatted with comma decimal**: locale not passed to `Intl.NumberFormat`.

---

## See also

- `u-error-handling` — `errorMessage(t, err)` consumes error keys from `error.*`
- `u-storage` — settings store persists language via MMKV
- `u-form` — schema messages are i18n keys
- `u-codegen` — Plop screen generator adds i18n stubs
