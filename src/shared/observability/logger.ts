import { log, type LogEntry } from './correlation';
import { getRequestContext } from './context';
import { redact } from './redaction';

/**
 * Structured, redacted child logger (A4).
 *
 * Wraps the baseline {@link log} sink with two behaviours:
 *  1. Auto-attaches correlation id and tenant scope from the active
 *     {@link RequestContext}, so call sites stay short.
 *  2. Runs every entry through {@link redact} so the security-privacy.md §7
 *     prohibited fields (credentials, payment, allergens, AI prompts, provider
 *     payloads) never reach stdout.
 *
 * Level gating, the `console` sink choice, and the `pid`/`ts` enrichment all
 * remain in `correlation.ts`; this layer only adds scope + redaction. Callers
 * may override the correlation id by passing it in `fields`.
 */

export interface Logger {
  trace(message: string, fields?: Record<string, unknown>): void;
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export function createLogger(scope?: string): Logger {
  const emit = (
    level: LogEntry['level'],
    message: string,
    fields?: Record<string, unknown>,
  ): void => {
    const ctx = getRequestContext();
    const correlationId =
      typeof fields?.correlationId === 'string' ? fields.correlationId : ctx?.correlationId;
    const entry: LogEntry = {
      level,
      message,
      ...fields,
      correlationId,
      ...(ctx?.restaurantId ? { restaurantId: ctx.restaurantId } : {}),
      ...(ctx?.locationId ? { locationId: ctx.locationId } : {}),
      ...(ctx?.actor ? { actor: ctx.actor } : {}),
      ...(scope ? { scope } : {}),
    };
    log(redact(entry) as LogEntry);
  };

  return {
    trace: (message, fields) => emit('trace', message, fields),
    debug: (message, fields) => emit('debug', message, fields),
    info: (message, fields) => emit('info', message, fields),
    warn: (message, fields) => emit('warn', message, fields),
    error: (message, fields) => emit('error', message, fields),
  };
}

/** Shared default logger. Use {@link createLogger} for a scoped instance. */
export const logger = createLogger();
