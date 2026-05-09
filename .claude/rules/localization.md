---
paths:
  - 'src/translations/**'
  - 'src/lib/i18n/**'
---

# Unicorn — Localisation Rules

This project uses **i18next + react-i18next** with JSON resources at
`src/translations/en.json` and `src/translations/vi.json`. Supported locales: `en`, `vi`.

Access strings via `useTranslation()` from `react-i18next`:

```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
return <Text>{t('settings.title')}</Text>;
```

Device locale detection uses `expo-localization`; user override persists via Zustand + MMKV (`StorageKeys.LOCALE`). There is **no `.tr()`**, no `easy_localization`, no ARB files.

## Adding a Translation Key

1. Add the key to `src/translations/en.json`:

```json
{
  "settings": {
    "title": "Settings"
  }
}
```

2. Add the **same key** to `src/translations/vi.json` with the Vietnamese translation. Every key must exist in both files — type-safe `t()` resolves only if both sides match.

```json
{
  "settings": {
    "title": "Cài đặt"
  }
}
```

3. Use it in any component:

```tsx
<Text>{t('settings.title')}</Text>
```

No regeneration step is needed — i18next reads JSON at runtime. If `Resources` types are exported in `src/lib/i18n/types.ts`, run `npm run typecheck` to surface missing keys.

## Parametrised Strings

```json
{
  "user": {
    "welcome": "Welcome, {{name}}"
  }
}
```

```tsx
t('user.welcome', { name: user.name });
```

Plurals via i18next's `_one` / `_other` suffixes:

```json
{ "items": "{{count}} item", "items_other": "{{count}} items" }
```

```tsx
t('items', { count });
```

## Error Messages

`AppError` codes resolve to localized strings via a small lookup table in `src/lib/errors/error-messages.ts`:

```ts
export const errorMessage = (t: TFunction, err: AppError) =>
  t(`errors.${err.code}`, { defaultValue: t('errors.unknown') });
```

When you add a new `AppErrorCode`, add a matching `errors.<code>` key in BOTH `en.json` AND `vi.json`.

## Token-Efficient Reads

- Use `grep -n '"settingsTitle"' src/translations/en.json` to locate a key instead of reading the whole file.
- Both JSON files are small; reading a targeted slice is fine, but prefer `grep` + targeted Edit over full rewrites.

## Don'ts

- ❌ No hardcoded user-facing strings in components — if it's visible, it goes through `t()`.
- ❌ Never copy the English value into `vi.json` as a placeholder — write a real Vietnamese translation (with full diacritics).
- ❌ Don't bypass i18next with template strings — every translatable string MUST be a key.
- ❌ Don't add a key to `en.json` without also adding to `vi.json` (sync rule is mandatory).
