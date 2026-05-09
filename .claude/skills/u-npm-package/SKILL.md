---
name: u-npm-package
description: 'Selecting, installing, configuring npm packages for Expo RN. Audit checklist, expo install vs npm install, native module setup, prebuild trigger. Triggers — npm install, package, dependency, library, expo install, native module, audit, package selection, peer dependency.'
---

# u-npm-package — Package Selection & Setup

## TL;DR

- All package commands use **npm** / **npx** — never pnpm, yarn, bun
- For SDK-pinned packages (anything starting with `expo-`, `@expo/...`, `react-native-...` that has Expo metadata), use `npx expo install <pkg>` — picks the version compatible with the current Expo SDK
- Plain JS libs: `npm install <pkg>`
- Native modules require `npx expo prebuild --clean` before next run
- Audit before adding: bundle size, maintenance, license, peer compatibility

## When to load

Adding a new dependency, evaluating alternatives, fixing a peer-dep warning, debugging a native build error after install, choosing between two libraries.

---

## Decision flow

```
Need a library X
├── Built-in to Expo SDK or RN core?  → use it.
├── Already in package.json?          → use existing version.
├── Has expo-* prefix or expo plugin? → npx expo install <X>
├── Pure JS (lodash, dayjs, zod)?     → npm install <X>
├── Has native code?                  → npx expo install <X> (preferred — handles config)
└── Then: prebuild if native, restart Metro
```

---

## Adding a package

### Plain JS (zod, dayjs, immer)

```bash
npm install zod
```

### Expo SDK-pinned (mmkv, secure-store, image, blur)

```bash
npx expo install react-native-mmkv expo-secure-store expo-image expo-blur
```

`npx expo install` reads SDK version from `app.config.ts` and pins compatible versions automatically. NEVER use plain `npm install` for these — wrong version pin breaks the build.

### Native module that requires config plugin

```bash
npx expo install @sentry/react-native
# Add to app.config.ts:
#   plugins: ['@sentry/react-native/expo']
npx expo prebuild --clean
```

### Dev-only

```bash
npm install --save-dev @types/lodash eslint-plugin-tailwindcss
```

---

## Audit checklist (before adding)

| Question                                          | Where to check                        |
| ------------------------------------------------- | ------------------------------------- |
| Maintenance? Last commit, open issues             | npm page, GitHub repo                 |
| Bundle size impact                                | bundlephobia.com                      |
| License compatible with proprietary?              | package.json `license`                |
| Peer-dep version compatible                       | `npm view <pkg> peerDependencies`     |
| Works with Expo Go OR requires custom dev client? | check for native code / config plugin |
| TypeScript types shipped or `@types/...`?         | `npm view <pkg> types`                |
| Alternatives considered?                          | weigh ≥2 options                      |

If any answer is "I don't know" — find out before installing.

---

## Common packages already in stack

| Concern           | Package                                                  | Install command                             |
| ----------------- | -------------------------------------------------------- | ------------------------------------------- | ----- |
| HTTP              | `axios`                                                  | `npm install axios`                         |
| Server state      | `@tanstack/react-query`                                  | `npm install @tanstack/react-query`         |
| Client state      | `zustand`                                                | `npm install zustand`                       |
| Storage (general) | `react-native-mmkv`                                      | `npx expo install react-native-mmkv`        |
| Storage (secure)  | `expo-secure-store`                                      | `npx expo install expo-secure-store`        |
| Auth crypto       | `expo-crypto`                                            | `npx expo install expo-crypto`              |
| i18n              | `i18next` `react-i18next` `expo-localization`            | mixed (use `expo install` for the expo one) |
| Forms             | `react-hook-form` `@hookform/resolvers` `zod`            | `npm install` (pure JS)                     |
| Sheets            | `@gorhom/bottom-sheet`                                   | `npm install` (uses RN-reanimated peer)     |
| Animations        | `react-native-reanimated` `react-native-gesture-handler` | `npx expo install`                          |
| Navigation        | `expo-router`                                            | `npx expo install`                          |
| Lists             | `@shopify/flash-list`                                    | `npx expo install`                          |
| Images            | `expo-image`                                             | `npx expo install`                          |
| Icons             | `@expo/vector-icons`                                     | `npx expo install`                          |
| Network           | `@react-native-community/netinfo`                        | `npx expo install`                          |
| Errors            | `@sentry/react-native`                                   | `npx expo install`                          |
| UI styling        | `nativewind` `tailwindcss` `class-variance-authority`    | `npm install`                               |
| Codegen           | `plop`                                                   | `npm install --save-dev`                    |
| E2E               | `maestro-cli` (separate from npm)                        | `curl -fsSL https://get.maestro.mobile.dev  | bash` |
| Test              | `jest` `@testing-library/react-native` `jest-expo`       | `npm install --save-dev`                    |

---

## Expo Go vs custom dev client

If a dependency has native code AND isn't in Expo Go's allow-list, you need a custom dev client:

```bash
npx expo install expo-dev-client
npx expo run:ios       # builds local custom client
# or
npx eas build --profile development --platform ios
```

After: launch the custom client, scan QR from `npx expo start`. Reanimated 4, gesture-handler, bottom-sheet, and most native packages REQUIRE custom dev client.

---

## Removing a package

```bash
npm uninstall <pkg>
```

Then:

1. Remove imports / config-plugin entries in `app.config.ts`
2. `npx expo prebuild --clean` if native
3. `rm -rf ios/Pods ios/build` (iOS) and rebuild
4. Search for orphaned references: `grep -rn '<pkg>' src app`

---

## Lockfile hygiene

- Always commit `package-lock.json`
- One `npm install` per session — no mixed `npm` + `pnpm` etc.
- Conflict in lockfile during merge: delete `package-lock.json`, run `npm install` again, commit the result
- Never edit lockfile by hand

---

## Peer-dep warnings

When `npm install` warns:

```
WARN  peer dep missing: react-native-reanimated@^4
```

Resolve by installing the matching peer at the recommended version:

```bash
npx expo install react-native-reanimated
```

If two packages disagree on peer ranges → check both maintainers, pick the package whose peer range is compatible with the rest of the stack. Don't `--legacy-peer-deps` unless you've verified it doesn't break.

---

## Do / Don't

| ✅                                               | ❌                         |
| ------------------------------------------------ | -------------------------- |
| `npx expo install` for SDK-aware packages        | `npm install` for `expo-*` |
| Audit (size, license, maintenance) before adding | Install first, audit later |
| `npx expo prebuild --clean` after native install | Skip prebuild              |
| Commit `package-lock.json`                       | `.gitignore` lockfile      |
| One package manager (npm)                        | Mix npm + yarn             |
| Pin via `npm install <pkg>@x.y` if breaking      | `^` everything             |

---

## See also

- `u-codegen` — full npm/expo command reference
- `u-architecture` — where third-party config lives (`src/lib/<concern>/`)
- `u-security` — license + supply-chain audit
- `u-performance` — bundle-size cost
