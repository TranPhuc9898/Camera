/**
 * Application logger — thin wrapper around react-native-logs.
 *
 * Severity threshold: 'debug' in __DEV__, 'warn' in production.
 * Critical errors are forwarded to Sentry in addition to local log output.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('App booted');
 *   logger.critical('Unhandled payment error', error);
 *
 * Namespaced child logger:
 *   const log = logger.extend('AuthStore');
 *   log.debug('token refreshed');  // prints "[AuthStore] token refreshed"
 */

import { logger as rnLogger, consoleTransport } from 'react-native-logs';
import { captureException } from '@sentry/react-native';

// ── Factory ─────────────────────────────────────────────────────────────────

const _base = rnLogger.createLogger({
  severity: __DEV__ ? 'debug' : 'warn',
  transport: consoleTransport,
  transportOptions: {
    colors: {
      debug: 'white',
      info: 'blueBright',
      warn: 'yellow',
      error: 'red',
    },
  },
  printLevel: true,
  printDate: false,
  enabled: true,
});

// ── Public API ───────────────────────────────────────────────────────────────

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// react-native-logs base instance methods are dynamically keyed; cast safely
type BaseLogger = Record<LogLevel, (...args: unknown[]) => void> & {
  extend: (ns: string) => Record<LogLevel, (...args: unknown[]) => void>;
};

const base = _base as unknown as BaseLogger;

/**
 * Application-wide logger with Sentry integration on `critical`.
 */
export const logger = {
  debug: (...args: unknown[]) => base.debug(...args),
  info: (...args: unknown[]) => base.info(...args),
  warn: (...args: unknown[]) => base.warn(...args),
  error: (...args: unknown[]) => base.error(...args),

  /**
   * Logs at error level AND captures exception in Sentry.
   * Use for unrecoverable/unexpected errors in production paths.
   */
  critical: (message: string, error?: unknown) => {
    base.error(`[CRITICAL] ${message}`, error);
    const exception = error instanceof Error ? error : new Error(message);
    captureException(exception, { extra: { message } });
  },

  /**
   * Returns a child logger that prefixes every message with `[namespace]`.
   *
   * @example
   * const log = logger.extend('AuthStore');
   * log.debug('user loaded');  // → "[AuthStore] user loaded"
   */
  extend: (namespace: string) => {
    const child = base.extend(namespace);
    return {
      debug: (...args: unknown[]) => child.debug(...args),
      info: (...args: unknown[]) => child.info(...args),
      warn: (...args: unknown[]) => child.warn(...args),
      error: (...args: unknown[]) => child.error(...args),
    };
  },
};

export type Logger = typeof logger;
