---
name: u-codegen
description: 'Plop generators, npm scripts, expo prebuild, eas build, env regen for unicorn. Single source of truth for ALL package commands. Triggers — plop, generator, scaffold, npx plop, npm run, expo prebuild, eas build, codegen, env, npm command reference.'
---

# u-codegen — Plop, npm scripts, Expo / EAS commands

## TL;DR

- All package management goes through **npm** / **npx** — never pnpm, yarn, bun
- New code is scaffolded with `npx plop <generator>` BEFORE filling logic
- Native command surface: `npx expo <cmd>` (dev), `npx eas <cmd>` (cloud builds)
- Plop generators live under `plop-templates/`, registered in `plopfile.js`
- Run Plop from repo root only

## When to load

Adding a new feature scaffold, adding a Plop generator, changing a script, regenerating `.env`, running prebuild after a native package install.

---

## Plop generators (built-in)

| Generator   | Creates                                                                             | Command              |
| ----------- | ----------------------------------------------------------------------------------- | -------------------- |
| `screen`    | `src/features/<f>/screens/<name>-screen.tsx` + route `app/<route>.tsx` + en/vi keys | `npx plop screen`    |
| `feature`   | Full feature folder skeleton (api.ts, types, store, use-cases/)                     | `npx plop feature`   |
| `store`     | `src/features/<f>/<f>-store.ts` Zustand boilerplate                                 | `npx plop store`     |
| `usecase`   | `src/features/<f>/use-cases/use-<verb>-<entity>.ts`                                 | `npx plop usecase`   |
| `api`       | `getX/createX/updateX/deleteX` block in `api.ts`                                    | `npx plop api`       |
| `sheet`     | `src/features/<f>/components/<name>-sheet.tsx`                                      | `npx plop sheet`     |
| `form`      | `src/features/<f>/components/<name>-form.tsx` (RHF + zod)                           | `npx plop form`      |
| `component` | Generic `src/features/<f>/components/<name>.tsx`                                    | `npx plop component` |

Each generator prompts for arguments — feature name, kebab-case slug, etc.

**Rule:** generate FIRST, then fill. Do not hand-craft files that a generator covers.

---

## Common npm scripts

```jsonc
// package.json — what's in there
{
  "scripts": {
    "start": "expo start",
    "ios": "expo run:ios",
    "android": "expo run:android",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "format": "prettier --write .",
    "plop": "plop",
    "i18n:check": "node scripts/i18n-parity-check.js",
    "prebuild": "expo prebuild --clean",
    "storybook": "STORYBOOK=1 expo start",
  },
}
```

```bash
npm install                         # install deps
npm install <pkg>                   # add a dep
npm install --save-dev <pkg>        # add a dev dep
npm uninstall <pkg>                 # remove a dep

npm run typecheck                   # tsc no-emit
npm run lint                        # eslint
npm run test                        # jest
```

---

## Expo / EAS commands

```bash
npx expo start                      # Metro bundler (dev)
npx expo start --clear              # clear cache (resolver issues)
npx expo install <pkg>              # install with version pinned to SDK

npx expo prebuild --clean           # regenerate ios/ + android/ from app.config.ts
                                    # required after adding native modules
npx expo run:ios                    # build + run iOS sim
npx expo run:android                # build + run Android emulator

npx eas build --profile development --platform ios
npx eas build --profile preview     --platform android
npx eas build --profile production  --platform all
npx eas submit --profile production --platform ios
```

**Cache nuke:**

```bash
rm -rf node_modules .expo ios/Pods ios/build android/build
npm install
npx expo prebuild --clean
```

---

## When to prebuild

Run `npx expo prebuild --clean` after:

- Adding a native dep (`react-native-mmkv`, `@gorhom/bottom-sheet`, etc.)
- Changing `app.config.ts` plugins / iOS/Android config
- Switching `APP_FLAVOR`

NOT needed for: pure JS deps, RN runtime updates, code-only changes.

---

## EAS build profiles

```jsonc
// eas.json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal" },
    "production": { "autoIncrement": true },
  },
}
```

| Profile       | Use for                          |
| ------------- | -------------------------------- |
| `development` | Native debug client for devs     |
| `preview`     | Internal QA / stakeholder review |
| `production`  | App Store / Play submission      |

---

## Env regen

`.env.development`, `.env.staging`, `.env.production` are gitignored. Copy from `.env.example` and fill. `app.config.ts` reads them via `EXPO_PUBLIC_*` prefix; client code reads via `src/config/env.ts` (zod-validated).

Adding a new env var:

1. Add to `.env.example` with placeholder
2. Add to all three `.env.*` files
3. Add zod field in `src/config/env.ts`
4. Add to EAS Secrets if needed at build time: `eas secret:create --scope project --name FOO --value bar`

---

## Plop template anatomy

```
plop-templates/
  screen/
    screen.tsx.hbs
    route.tsx.hbs
plopfile.js               ← prompts + actions
```

```js
// plopfile.js (excerpt)
module.exports = (plop) => {
  plop.setGenerator('screen', {
    description: 'Create a feature screen + route + i18n keys',
    prompts: [
      { type: 'input', name: 'feature', message: 'Feature folder' },
      { type: 'input', name: 'name', message: 'Screen name (kebab-case)' },
      { type: 'input', name: 'route', message: 'Route path (e.g. (app)/orders/[id])' },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/features/{{feature}}/screens/{{name}}-screen.tsx',
        templateFile: 'plop-templates/screen/screen.tsx.hbs',
      },
      {
        type: 'add',
        path: 'app/{{route}}.tsx',
        templateFile: 'plop-templates/screen/route.tsx.hbs',
      },
      {
        type: 'modify',
        path: 'src/translations/en.json',
        pattern: /(\s*})$/,
        template: ',\n  "{{name}}": { "title": "{{name}}" }$1',
      },
      {
        type: 'modify',
        path: 'src/translations/vi.json',
        pattern: /(\s*})$/,
        template: ',\n  "{{name}}": { "title": "{{name}}" }$1',
      },
    ],
  });
};
```

---

## i18n parity check

```bash
npm run i18n:check
```

Lists keys present in only one of `vi.json` / `en.json`. Run before commit. CI runs the same.

---

## Do / Don't

| ✅                              | ❌                                         |
| ------------------------------- | ------------------------------------------ |
| `npm` / `npx`                   | `pnpm`, `yarn`, `bun`                      |
| `npx plop` to scaffold          | Hand-craft new files                       |
| `npx expo install` for SDK deps | `npm install` for SDK deps (wrong version) |
| Prebuild after native install   | Skip prebuild and wonder why build fails   |
| EAS Secrets for build-time env  | Commit `.env.production`                   |

---

## See also

- `u-architecture` — what each generated file looks like
- `u-screen` / `u-form` / `u-sheet` — manual code patterns when generator doesn't fit
- `u-i18n` — i18n parity script details
- `u-npm-package` — adding/auditing packages
