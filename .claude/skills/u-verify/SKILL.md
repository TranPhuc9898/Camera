---
name: u-verify
description: 'End-to-end real-device UI automation via Maestro YAML flows. testID conventions, flow files, login flow reuse, CI integration. Triggers — e2e, end to end, maestro, verify, automation, test flow, testID, real device, CI test, integration test, smoke test.'
---

# u-verify — E2E with Maestro

## TL;DR

- E2E tool: **Maestro** (YAML flows, real device or simulator) — NOT Detox, NOT Appium
- Flows live in `e2e/` at repo root, run with `maestro test e2e/<flow>.yaml`
- Every interactive element gets a stable `testID="kebab-case"` — Maestro selects by id, never by text (text is i18n-volatile)
- Reusable sub-flows under `e2e/_shared/` (`sign-in.yaml`, `seed-state.yaml`)
- CI: install Maestro CLI in workflow, run flows on iOS/Android sim
- DO NOT mock backend — Maestro is integration-grade; use a staging API or seed data via API setup

## When to load

Adding/editing an E2E flow, configuring testIDs, debugging flaky flow, integrating with CI, deciding what to E2E vs unit-test.

---

## Setup

```bash
curl -fsSL https://get.maestro.mobile.dev | bash
maestro --version
```

Repo:

```
e2e/
  _shared/
    sign-in.yaml
    seed-orders.yaml
  smoke.yaml                   ← always-runs sanity flow
  flows/
    auth/
      sign-in.yaml
      sign-up.yaml
    orders/
      list-and-cancel.yaml
      filter.yaml
```

---

## testID conventions

```tsx
<Pressable testID="orders-list-cancel-cta">{t('orders.cancel')}</Pressable>
<TextInput  testID="auth-email-input" />
<Text       testID="orders-list-empty-text">{t('orders.empty')}</Text>
```

**Pattern:** `<feature>-<surface>-<element>[-<role>]`

- `orders-list-cancel-cta`
- `orders-detail-status-badge`
- `auth-sign-in-submit-button`

**Rule:** every Pressable, TextInput, and any element a flow asserts on MUST have a testID. Lint rule (custom, eslint-plugin-react-native-a11y) flags missing testIDs on these element types.

---

## Flow file shape

```yaml
# e2e/flows/orders/list-and-cancel.yaml
appId: com.unicorn.app
name: Cancel an order
tags:
  - orders
  - smoke

---
- runFlow: ../../_shared/sign-in.yaml
- tapOn:
    id: tabs-orders
- assertVisible:
    id: orders-list-screen
- tapOn:
    id: orders-list-item-0
- assertVisible:
    id: orders-detail-screen
- tapOn:
    id: orders-detail-cancel-cta
- inputText: 'Changed my mind'
- tapOn:
    id: orders-cancel-confirm
- assertVisible:
    id: orders-detail-status-badge
- assertVisible: 'Cancelled' # text fallback OK for assertion only
```

**Rules:**

- `appId` always at top (matches `app.config.ts` bundleId)
- Tap by id, NEVER by text (i18n volatility)
- Assert by id when possible; text assert is OK after id has confirmed the screen

---

## Reusable sub-flow

```yaml
# e2e/_shared/sign-in.yaml
appId: com.unicorn.app
---
- launchApp:
    clearState: true
- tapOn:
    id: auth-email-input
- inputText: 'qa+1@unicorn.app'
- tapOn:
    id: auth-password-input
- inputText: 'QaTest123!'
- tapOn:
    id: auth-sign-in-submit
- assertVisible:
    id: tabs-home
```

Invoke with `runFlow: ../../_shared/sign-in.yaml`.

---

## Running

```bash
maestro test e2e/flows/orders/list-and-cancel.yaml          # one flow
maestro test e2e/                                           # everything under e2e/
maestro test --include-tags smoke e2e/                      # tagged
maestro test --device "iPhone 15" e2e/smoke.yaml            # specific simulator
maestro studio                                              # interactive flow recorder
```

`maestro studio` is fast for authoring — record taps, then save as YAML.

---

## CI workflow (GitHub Actions excerpt)

```yaml
# .github/workflows/e2e.yml
- name: Install Maestro
  run: |
    curl -fsSL https://get.maestro.mobile.dev | bash
    echo "$HOME/.maestro/bin" >> $GITHUB_PATH

- name: Build for testing
  run: npx eas build --profile preview --platform ios --local --non-interactive

- name: Boot simulator
  run: xcrun simctl boot "iPhone 15"

- name: Install app
  run: xcrun simctl install booted ./build/*.app

- name: Run smoke
  run: maestro test --include-tags smoke e2e/
```

---

## Backend strategy

Pick ONE per environment:

| Approach                                    | Use when                   |
| ------------------------------------------- | -------------------------- |
| Staging API (long-lived test users)         | Default — fast & realistic |
| Seed via test endpoint (`POST /test/reset`) | Need clean state per flow  |
| Local mock server (msw-rn)                  | Backend not stable in CI   |

DO NOT mock through Maestro itself — it's UI-only.

---

## What to E2E vs unit test

| Use E2E                                         | Use unit / integration        |
| ----------------------------------------------- | ----------------------------- |
| Auth flow (sign-in → home)                      | A single component's variants |
| Critical user journey end-to-end                | Hook return shape             |
| Cross-screen state (filter survives navigation) | Reducer transitions           |
| Push notification → deeplink → screen           | Pure functions                |
| Cancel order, see status update                 | Form validation rules         |

E2E budget: keep <15 flows, prioritize smoke + revenue paths.

---

## Flake reduction

- Always `clearState: true` in `launchApp` for the first step
- Wait for screen-level testID before interacting (`assertVisible: id: <screen-id>`)
- Avoid hard `wait` — use `assertVisible` with implicit timeout
- Disable animations in test build via `app.config.ts` flag if needed

---

## Do / Don't

| ✅                                           | ❌                                   |
| -------------------------------------------- | ------------------------------------ |
| Tap by `id:`                                 | Tap by text                          |
| testID on every Pressable / TextInput        | Add testIDs reactively after a flake |
| Run on Maestro Cloud OR self-hosted CI       | Manual local-only                    |
| Reusable sub-flow for sign-in                | Repeat sign-in steps in every flow   |
| Tag flows (`smoke`, `regression`, `nightly`) | One mega-flow                        |
| Real backend (staging)                       | Mocks via MSW behind Maestro         |

---

## Common pitfalls

- **Element not found**: testID added but component re-rendered with key change. Use stable parent testID.
- **Flow passes locally, fails in CI**: simulator vs device timing. Add explicit `assertVisible` waits.
- **Text assertion fails**: locale switched between dev and CI. Assert by id instead.
- **Maestro can't find sub-flow**: `runFlow:` path is relative to current YAML file, not repo root.

---

## See also

- `u-screen` — testID at screen root for navigation assertions
- `u-rn-ui` — testID on every interactive primitive
- `u-testing` — Jest + RTL for unit/integration (faster, narrower)
- `u-codegen` — `npm run` scripts that wrap maestro commands
