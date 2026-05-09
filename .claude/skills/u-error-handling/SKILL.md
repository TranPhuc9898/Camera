---
name: u-error-handling
description: 'AppError + AppErrorCode pattern, errorMessage(t, err) i18n helper, try/catch boundaries, snackbar/toast, ErrorBoundary, Sentry capture. Triggers — error handling, AppError, AppErrorCode, try catch, error boundary, snackbar, toast error, Sentry capture, log critical.'
---

# u-error-handling — Errors & Surfacing

## TL;DR

- One error type: `AppError` with `code: AppErrorCode` and i18n-ready `message`
- All API failures throw `AppError` (mapped at `client.ts` interceptor — see `u-api`)
- Surface in UI via `errorMessage(t, err)` from `@/lib/i18n` — never raw `err.message`
- `log.critical(...)` pipes to Sentry; `log.error/warning/info/debug` are local-only
- One `<ErrorBoundary>` wraps `<Stack>` in `app/_layout.tsx` for unrecoverable render errors
- For mutations: catch in screen, surface via toast — do NOT swallow

## When to load

Adding `try/catch` in a use-case/component, defining new error code, wiring snackbar/toast, debugging "Network error" string showing in UI.

---

## `AppError` shape

```ts
// src/lib/error/app-error.ts
export enum AppErrorCode {
  Network = 'network',
  Timeout = 'timeout',
  Unauthorized = 'unauthorized',
  Forbidden = 'forbidden',
  NotFound = 'not-found',
  Validation = 'validation',
  Conflict = 'conflict',
  Server = 'server',
  Unknown = 'unknown',
}

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly details?: { field?: string; cause?: unknown },
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
```

Add new codes only when UI needs to discriminate. `Validation` covers most BE 4xx; only break out when the fix path differs.

---

## i18n surfacing

```ts
// src/lib/i18n/error-message.ts
import type { TFunction } from 'i18next';
import { AppError, AppErrorCode, isAppError } from '@/lib/error/app-error';

export function errorMessage(t: TFunction, err: unknown): string {
  if (!isAppError(err)) return t('error.unknown');
  switch (err.code) {
    case AppErrorCode.Network:
      return t('error.network');
    case AppErrorCode.Timeout:
      return t('error.timeout');
    case AppErrorCode.Unauthorized:
      return t('error.session-expired');
    case AppErrorCode.Forbidden:
      return t('error.forbidden');
    case AppErrorCode.NotFound:
      return t('error.not-found');
    case AppErrorCode.Validation:
      return err.message; // BE message is user-readable
    case AppErrorCode.Conflict:
      return err.message;
    case AppErrorCode.Server:
      return t('error.server');
    default:
      return t('error.unknown');
  }
}
```

Add the keys to BOTH `vi.json` and `en.json`. See `u-i18n`.

---

## Mutation error pattern

```tsx
const { t } = useTranslation();
const { mutate, isPending } = useUpdateOrder();

const submit = () => {
  mutate(payload, {
    onError: (err) => {
      log.warning('updateOrder failed', err);
      toast.error(errorMessage(t, err));
    },
    onSuccess: () => toast.success(t('orders.updated')),
  });
};
```

**Never** swallow with empty catch. **Never** log `console.log` — use `log.*` (see `u-analytics`).

---

## Query error pattern

```tsx
const { data, error, isLoading } = useGetOrders(params);

if (isLoading) return <ScreenLoader />;
if (error) return <ErrorState message={errorMessage(t, error)} onRetry={refetch} />;
return <OrderList orders={data} />;
```

`<ErrorState>` is a reusable component in `src/lib/ui/error-state.tsx` — single illustration + message + retry CTA.

---

## ErrorBoundary

```tsx
// src/lib/ui/error-boundary.tsx
import { Component, type ReactNode } from 'react';
import * as Sentry from '@sentry/react-native';
import { log } from '@/lib/logger';

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    log.critical('Uncaught render error', error, info.componentStack);
    Sentry.captureException(error);
  }
  render() {
    if (this.state.hasError)
      return <FullScreenError onRestart={() => this.setState({ hasError: false })} />;
    return this.props.children;
  }
}
```

Wrap once at root, in `app/_layout.tsx`:

```tsx
<ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <Stack />
  </QueryClientProvider>
</ErrorBoundary>
```

---

## Logger levels (and when each pipes to Sentry)

| Level          | Use for                                   | Sentry? |
| -------------- | ----------------------------------------- | ------- |
| `log.debug`    | Dev-only diagnostic                       | No      |
| `log.info`     | Lifecycle events ("login succeeded")      | No      |
| `log.warning`  | Handled error (caught & surfaced)         | No      |
| `log.error`    | Bug we want to be aware of (non-blocking) | No      |
| `log.critical` | Unhandled / breaks user flow              | **Yes** |

```ts
import { log } from '@/lib/logger';
log.critical('payment.confirm failed', err, { orderId });
```

Never `console.log` / `console.warn`. Lint rule blocks them.

---

## Try / catch shape

```ts
try {
  await repo.cancel(id, reason);
} catch (err) {
  if (isAppError(err) && err.code === AppErrorCode.Conflict) {
    // domain-specific recovery
    return { ok: false as const, reason: 'already-cancelled' };
  }
  log.warning('cancel failed', err);
  throw err;
}
```

Catch ONLY when you can do something useful (recover, log, re-throw with context). Otherwise let it propagate.

---

## Do / Don't

| ✅                              | ❌                                        |
| ------------------------------- | ----------------------------------------- |
| `throw new AppError(code, msg)` | `throw new Error('Something went wrong')` |
| `errorMessage(t, err)` in UI    | `err.message` directly                    |
| `log.critical` for unhandled    | `Sentry.captureException` ad-hoc          |
| Catch when you have a recovery  | `try { ... } catch {}` swallow            |
| Add new code when UI differs    | New code per BE status                    |

---

## Common pitfalls

- **`AxiosError` reaching UI**: interceptor missed mapping. Audit `mapAxiosError` in `client.ts`.
- **Translation missing**: every code in `errorMessage` MUST exist in BOTH locales.
- **Caught and swallowed silently**: no log → ghost bug. Always `log.warning` at minimum.
- **ErrorBoundary doesn't catch async**: it catches render errors only. Async errors must be `.catch`-ed at call site.

---

## See also

- `u-api` — interceptor maps `AxiosError` → `AppError`
- `u-i18n` — `errorMessage` keys live in `vi.json` + `en.json`
- `u-analytics` — `log.critical` pipes to Sentry sink
- `u-navigation` — toast/snackbar primitives
