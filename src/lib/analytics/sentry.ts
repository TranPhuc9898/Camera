import * as Sentry from '@sentry/react-native';
import { Env } from '@/config/env';

export function initSentry() {
  if (!Env.SENTRY_DSN) return;
  Sentry.init({
    dsn: Env.SENTRY_DSN,
    environment: Env.APP_ENV,
    tracesSampleRate: Env.APP_ENV === 'production' ? 0.2 : 1.0,
    enabled: Env.APP_ENV !== 'development',
  });
}

export { Sentry };
