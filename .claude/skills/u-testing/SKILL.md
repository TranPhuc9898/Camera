---
name: u-testing
description: 'Unit + integration testing — Jest + React Native Testing Library + MSW. Hooks, components, stores, api mocks. Triggers — test, jest, RNTL, react native testing library, MSW, mock service worker, unit test, integration test, snapshot, coverage.'
---

# u-testing — Jest + RNTL

## TL;DR

- Test runner: **Jest** with `jest-expo` preset; query lib: **@testing-library/react-native**
- API mocking: **MSW** (`msw` + `msw/node`) — DON'T mock axios directly
- Test pyramid: many unit (pure fns, hooks) + few integration (component + store + msw); E2E lives in `u-verify` (Maestro)
- Co-locate tests: `foo.ts` ↔ `foo.test.ts` (same folder)
- Avoid snapshot tests except for stable design tokens — they rot quickly
- Aim for behavior, not implementation: query by role / label, not by class / id

## When to load

Adding tests to a feature, configuring Jest, debugging a flaky test, deciding what to unit-test vs integrate vs E2E.

---

## Setup

```bash
npx expo install jest-expo jest @testing-library/react-native msw @types/jest
```

`package.json`:

```jsonc
"scripts": {
  "test":       "jest",
  "test:watch": "jest --watch",
  "test:cov":   "jest --coverage"
}
```

`jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo|react-native-reanimated|@gorhom|@shopify))',
  ],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.stories.tsx', '!src/**/index.ts'],
};
```

`jest.setup.ts`:

```ts
import '@testing-library/jest-native/extend-expect';
import { server } from './test/msw-server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Test pyramid

| Layer                               | Tool                     | Count |
| ----------------------------------- | ------------------------ | ----- |
| Pure fns (utils, schemas, reducers) | Jest                     | Many  |
| Hooks (TanStack, Zustand selectors) | Jest + `renderHook`      | Many  |
| Components (presentation only)      | RNTL `render`            | Some  |
| Integration (screen + store + msw)  | RNTL + MSW               | Few   |
| E2E (real device)                   | Maestro (see `u-verify`) | < 15  |

---

## Pure function

```ts
// src/lib/format/format-currency.test.ts
import { formatCurrency } from './format-currency';

describe('formatCurrency', () => {
  it('formats VND', () => {
    expect(formatCurrency(123_456, 'VND')).toBe('123.456 ₫');
  });

  it('handles zero', () => {
    expect(formatCurrency(0, 'VND')).toBe('0 ₫');
  });
});
```

---

## Hook

```ts
// src/features/orders/hooks/use-cancel-order.test.ts
import { renderHook, act, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCancelOrder } from './use-cancel-order'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

it('calls api and invalidates list', async () => {
  const { result } = renderHook(() => useCancelOrder(), { wrapper })
  await act(() => result.current.mutateAsync({ id: 'o1', reason: 'x' }))
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
})
```

---

## Component

```tsx
// src/lib/ui/button/button.test.tsx
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Button } from './button';

it('calls onPress when not disabled', () => {
  const onPress = jest.fn();
  render(<Button onPress={onPress}>Submit</Button>);
  fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('does not call onPress when disabled', () => {
  const onPress = jest.fn();
  render(
    <Button onPress={onPress} disabled>
      Submit
    </Button>,
  );
  fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
  expect(onPress).not.toHaveBeenCalled();
});
```

**Query priority** (RNTL):

1. `getByRole` (most a11y-aligned)
2. `getByLabelText` / `getByPlaceholderText`
3. `getByText`
4. `getByTestId` (last resort, tied to implementation)

---

## Integration with MSW

```ts
// test/msw-server.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
  http.get('*/orders', () =>
    HttpResponse.json({
      data: [{ id: 'o1', code: 'ABC', status: 'pending', total: 100, createdAt: '2026-01-01' }],
      code: 200,
    }),
  ),
);
```

```tsx
// src/features/orders/__tests__/orders-list-screen.test.tsx
it('renders orders from api', async () => {
  render(<OrdersListScreen />, { wrapper: AppProviders });
  expect(await screen.findByText('ABC')).toBeOnTheScreen();
});

it('shows error on 500', async () => {
  server.use(http.get('*/orders', () => HttpResponse.json({ message: 'boom' }, { status: 500 })));
  render(<OrdersListScreen />, { wrapper: AppProviders });
  expect(await screen.findByText(/something went wrong/i)).toBeOnTheScreen();
});
```

`AppProviders` test wrapper composes QueryClient + i18n + Theme + (test-only) navigation container.

---

## Zustand store

```ts
// src/features/orders/store/draft-store.test.ts
import { useDraftStore } from './draft-store';

beforeEach(() => useDraftStore.setState(useDraftStore.getInitialState()));

it('updates draft', () => {
  useDraftStore.getState().setDraft({ note: 'hi' });
  expect(useDraftStore.getState().draft.note).toBe('hi');
});

it('resets', () => {
  useDraftStore.getState().setDraft({ note: 'hi' });
  useDraftStore.getState().reset();
  expect(useDraftStore.getState().draft.note).toBe('');
});
```

Reset state between tests — Zustand persists in-memory across `it` blocks.

---

## What to test

| Code                     | Test?         | What                               |
| ------------------------ | ------------- | ---------------------------------- |
| Pure fn                  | ✅ Yes        | All branches                       |
| Zod schema               | ✅ Yes        | Edge cases (empty, max, malformed) |
| Hook                     | ✅ Yes        | Return shape, side-effects         |
| Component (presentation) | ✅ Yes        | Variants, callbacks fire           |
| Component (connected)    | Maybe         | Integration test instead           |
| Screen                   | Integration   | Critical flow only                 |
| Whole user journey       | E2E (Maestro) | Smoke + revenue paths              |
| Implementation detail    | ❌ No         | (test the behavior, not the impl)  |

---

## What NOT to test

- Library internals (don't test that TanStack invalidates — trust the lib)
- Style (use design-token tests / Storybook visual regression)
- Animation timings (flaky; use Maestro to assert post-state)
- Snapshot of dynamic UI (rots; brittle)
- Private fns (test through public surface)

---

## Mocking strategy

| Boundary    | How                                                                            |
| ----------- | ------------------------------------------------------------------------------ |
| HTTP        | MSW (intercepts real fetch/axios)                                              |
| MMKV        | `jest.mock('@/lib/storage')` with in-memory map                                |
| SecureStore | `jest.mock('expo-secure-store')` returning Promise.resolve                     |
| Navigation  | `jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))` |
| Sentry      | `jest.mock('@sentry/react-native')` no-op                                      |
| Date        | `jest.useFakeTimers().setSystemTime(new Date('2026-01-01'))`                   |

DON'T mock axios directly — use MSW. Mocking the HTTP client misses interceptor logic.

---

## Coverage

- Target: **70% statements** for `src/`, **90%** for `src/lib/`
- Don't measure or chase coverage on screens / glue code — diminishing returns
- Coverage reports as PR comment via CI

```bash
npm run test:cov
```

---

## Flaky tests

| Cause                                   | Fix                                                       |
| --------------------------------------- | --------------------------------------------------------- |
| `setTimeout` or `requestAnimationFrame` | `jest.useFakeTimers()` + `act(() => jest.runAllTimers())` |
| Async without `await`                   | `await waitFor(() => expect(...))`                        |
| Unhandled MSW request                   | `onUnhandledRequest: 'error'` (already in setup)          |
| Non-deterministic order                 | Tests must NOT share state — reset stores in `beforeEach` |
| Time-zone dependent                     | Mock with `setSystemTime`                                 |

Quarantine flaky tests with `it.skip` + a TODO + create a follow-up — don't merge a flaky test green.

---

## Do / Don't

| ✅                         | ❌                                                           |
| -------------------------- | ------------------------------------------------------------ |
| Query by role / label      | Query by testID first                                        |
| MSW for HTTP               | Mock axios directly                                          |
| Reset stores between tests | Rely on test order                                           |
| Test behavior              | Test implementation                                          |
| `await waitFor(...)`       | Sleep / arbitrary timeout                                    |
| Co-locate `*.test.ts`      | Separate `__tests__` dir (only for screen integration tests) |
| `findBy*` for async        | `waitFor(() => getBy*)` (verbose)                            |

---

## Common pitfalls

- **Forgot transformIgnorePatterns**: import errors from RN-only modules. Re-add the regex.
- **Test passes locally, fails in CI**: timezone / locale difference. Pin `TZ=UTC` and `LANG=en_US.UTF-8`.
- **`act` warnings**: state updates outside `act()`. Wrap mutation calls in `act(async () => ...)`.
- **MSW handler not matched**: relative path vs absolute. Use `*` in handler URL.
- **Cleanup not running**: missing `afterEach(() => cleanup())` — RNTL auto-cleanup since v12, but verify.

---

## See also

- `u-verify` — E2E with Maestro (separate from unit/integration)
- `u-usecase` — hook patterns being tested
- `u-storage` — mock approach for MMKV / SecureStore
- `u-finalize` — test gate before commit
