# `src/` — Unicorn business logic

Folder convention (chốt theo plan `260506-1500-research-...`):

```
src/
├── components/         # Design system & shared UI (không phụ thuộc feature nào)
│   ├── ui/             # Atomic: Button, Input, Text, Modal, IconSymbol, Collapsible
│   └── shared/         # Composite: Header, EmptyState, ListSkeleton
│
├── features/           # Feature modules (self-contained, group theo domain)
│   └── <feature>/
│       ├── screens/        # *-screen.tsx — gọi từ app/ qua Expo Router
│       ├── components/     # Component riêng của feature
│       ├── api.ts          # TanStack Query hooks (server state)
│       ├── use-<x>-store.ts # Zustand store (client state, nếu có)
│       ├── types.ts
│       └── index.ts        # public exports
│
├── lib/                # Cross-cutting infrastructure (dùng cho mọi feature)
│   ├── api/            # axios/ofetch client + interceptors + query provider
│   ├── auth/           # secure-storage wrapper, token manager
│   ├── i18n/           # i18next init + type-safe keys
│   ├── analytics/      # Sentry init, event tracking
│   ├── storage/        # MMKV wrapper
│   └── hooks/          # Cross-cutting hooks (useColorScheme, useAppState, ...)
│
├── theme/              # Design tokens (colors, spacing, typography, radius)
├── config/             # App config + env (zod-parsed)
├── translations/       # i18n JSON resources (vi.json, en.json)
├── types/              # Global TS types (api, navigation)
└── utils/              # Pure helpers (date, format, validation/zod schemas)
```

## Path aliases

- `@/*` → `src/*`
- `@/app/*` → `app/*` (Expo Router routes)
- `@/assets/*` → `assets/*`

## Naming

- Files: `kebab-case` (`login-screen.tsx`, `use-auth-store.ts`)
- React components: `PascalCase` (`LoginScreen`, `AuthStore`)
- Hooks: `use-*` prefix
- Screens: `*-screen.tsx` suffix
- Tests: colocated, `*.test.tsx` cạnh file

## Quy tắc

1. `app/` chỉ là routing wrapper mỏng — gọi screen từ `features/<x>/screens/`.
2. Feature KHÔNG được import từ feature khác. Cần share → đẩy lên `lib/` hoặc `components/`.
3. Server state → TanStack Query trong `features/*/api.ts`.
4. Client state → Zustand (sau khi chốt combo).
5. Form → React Hook Form + zod (sau khi install).

## Stack chốt sau (đang scaffold structure trước)

Các tool sau sẽ được install khi anh chốt combo trong plan `research-t-p-trung-soft-beaver.md`:

- State combo: A (Zustand+TanStack) / B (RTK+RTKQ) / C (MST+TanStack)
- Styling: NativeWind v4 / StyleSheet
- i18n, Sentry, EAS Update, Husky, Maestro, ...
