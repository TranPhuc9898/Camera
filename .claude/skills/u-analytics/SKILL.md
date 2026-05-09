---
name: u-analytics
description: 'Sentry RN — events, breadcrumbs, performance. AnalyticEvent registry + analyticPerformer. Logger sink. Triggers — analytics, sentry, event, breadcrumb, capture exception, log critical, performance, transaction, AnalyticEvent.'
---

# u-analytics — Sentry + Event Pipeline

## TL;DR

- Single SDK: `@sentry/react-native` — for both error reporting AND product analytics events
- All events declared in `AnalyticEvent` registry — no ad-hoc strings
- Fire via `analyticPerformer.track('event-name', props)` — never `Sentry.addBreadcrumb` directly in features
- `log.critical(...)` pipes to `Sentry.captureException` (logger sink)
- Performance: wrap critical user flows in `Sentry.startSpan({ name, op }, () => ...)`
- DSN via `EXPO_PUBLIC_SENTRY_DSN` (env-validated)

## When to load

Adding a new tracked event, wiring Sentry on a new feature, instrumenting a slow flow, debugging missing events.

---

## Sentry init

```ts
// src/lib/analytics/index.ts
import * as Sentry from '@sentry/react-native';
import { ENV } from '@/config/env';

Sentry.init({
  dsn: ENV.SENTRY_DSN,
  environment: ENV.APP_FLAVOR, // development | preview | production
  tracesSampleRate: ENV.APP_FLAVOR === 'production' ? 0.2 : 1.0,
  enableAutoSessionTracking: true,
  enableNative: true,
  release: `unicorn@${ENV.APP_VERSION}+${ENV.BUILD_NUMBER}`,
});
```

Wrap root: `export default Sentry.wrap(RootLayout)` in `app/_layout.tsx`.

---

## Event registry

```ts
// src/lib/analytics/events.ts
export enum AnalyticEvent {
  // Auth
  signInAttempted = 'auth.sign-in.attempted',
  signInSucceeded = 'auth.sign-in.succeeded',
  signInFailed = 'auth.sign-in.failed',
  signedOut = 'auth.signed-out',

  // Orders
  orderListViewed = 'orders.list.viewed',
  orderDetailViewed = 'orders.detail.viewed',
  orderCancelled = 'orders.cancelled',
  orderFilterApplied = 'orders.filter.applied',

  // App lifecycle
  appOpened = 'app.opened',
  pushReceived = 'app.push.received',
  deeplinkResolved = 'app.deeplink.resolved',
}

export interface EventProps {
  [AnalyticEvent.signInAttempted]: { method: 'password' | 'biometric' | 'oauth' };
  [AnalyticEvent.signInFailed]: { method: string; reason: string };
  [AnalyticEvent.orderCancelled]: { orderId: string; reason: string };
  // ...
}
```

**Rule:** every new event added to registry needs (a) the enum value, (b) a typed props entry. No untyped events.

---

## Performer

```ts
// src/lib/analytics/performer.ts
import * as Sentry from '@sentry/react-native';
import { log } from '@/lib/logger';
import { AnalyticEvent, type EventProps } from './events';

class AnalyticPerformer {
  track<E extends AnalyticEvent>(
    event: E,
    props?: E extends keyof EventProps ? EventProps[E] : never,
  ) {
    log.debug(`[analytics] ${event}`, props);
    Sentry.addBreadcrumb({
      category: 'analytics',
      message: event,
      level: 'info',
      data: props,
    });
  }

  identify(userId: string, traits?: Record<string, string | number>) {
    Sentry.setUser({ id: userId, ...traits });
  }

  reset() {
    Sentry.setUser(null);
  }
}

export const analyticPerformer = new AnalyticPerformer();
```

---

## Usage

```tsx
import { analyticPerformer } from '@/lib/analytics/performer';
import { AnalyticEvent } from '@/lib/analytics/events';

// Fire from a screen
useEffect(() => {
  analyticPerformer.track(AnalyticEvent.orderListViewed);
}, []);

// Fire from mutation
mutate(payload, {
  onSuccess: () => analyticPerformer.track(AnalyticEvent.signInSucceeded, { method: 'password' }),
  onError: (err) =>
    analyticPerformer.track(AnalyticEvent.signInFailed, {
      method: 'password',
      reason: isAppError(err) ? err.code : 'unknown',
    }),
});

// Identify on auth
analyticPerformer.identify(user.id, { plan: user.plan });

// Reset on sign-out
analyticPerformer.reset();
```

---

## Logger sink → Sentry

```ts
// src/lib/logger/index.ts (excerpt)
import * as Sentry from '@sentry/react-native';
import { logger } from 'react-native-logs';

const baseLogger = logger.createLogger({
  /* ... */
});

export const log = {
  debug: baseLogger.debug.bind(baseLogger),
  info: baseLogger.info.bind(baseLogger),
  warning: baseLogger.warn.bind(baseLogger),
  error: baseLogger.error.bind(baseLogger),
  critical: (msg: string, err?: unknown, extra?: object) => {
    baseLogger.error(msg, err, extra);
    if (err instanceof Error) Sentry.captureException(err, { extra: { msg, ...extra } });
    else Sentry.captureMessage(msg, { extra: { err, ...extra }, level: 'fatal' });
  },
};
```

**Only `log.critical` reaches Sentry as an exception.** Other levels are local-only — to avoid noise quota burn.

---

## Performance tracing

```ts
import * as Sentry from '@sentry/react-native';

await Sentry.startSpan({ name: 'orders.cancel', op: 'mutation' }, async () => {
  await repo.cancel(id, reason);
});
```

Wrap user-facing flows: sign-in, checkout submit, search, list load. Don't instrument every helper.

---

## Privacy

- Never put PII (email, name, full address) in event `props`. Use IDs.
- `identify(userId)` is OK; `identify(email)` is NOT.
- Strip query strings from URLs in breadcrumbs (Sentry `beforeBreadcrumb` hook).
- Verify privacy policy disclosure before launching new tracking.

---

## Do / Don't

| ✅                                         | ❌                               |
| ------------------------------------------ | -------------------------------- |
| `analyticPerformer.track(AnalyticEvent.x)` | `Sentry.addBreadcrumb` ad-hoc    |
| Add event to `events.ts` registry          | Inline string `'order_clicked'`  |
| `log.critical` for unhandled               | `Sentry.captureException` direct |
| `identify(userId)` only                    | Identify with email/name         |
| `Sentry.startSpan` for user flows          | Span every helper                |
| Sample 0.2 in prod                         | Sample 1.0 in prod (quota burn)  |

---

## Testing

Mock the performer in tests:

```ts
jest.mock('@/lib/analytics/performer', () => ({
  analyticPerformer: { track: jest.fn(), identify: jest.fn(), reset: jest.fn() },
}));
```

Then assert: `expect(analyticPerformer.track).toHaveBeenCalledWith(AnalyticEvent.orderCancelled, { ... })`.

---

## Common pitfalls

- **Events not showing in Sentry**: SDK init not running before first event (init in module top-level, not in component).
- **Missing user context**: forgot `identify` after sign-in.
- **PII leak**: passed user object directly as props instead of IDs.
- **Quota exhausted**: `tracesSampleRate: 1.0` in production.

---

## See also

- `u-error-handling` — `log.critical` pipes here
- `u-architecture` — events registry lives in `src/lib/analytics/`
- `u-security` — privacy review checklist
- `u-performance` — `Sentry.startSpan` for user flows
