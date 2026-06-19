import { randomUUID } from 'node:crypto';

/**
 * Correlation ID helpers (A4 observability baseline).
 *
 * Per api-contracts.md §1: every request and response carries a correlation ID.
 * Workers propagate it across the outbox → provider → reconciliation chain.
 */

const HEADER = 'x-correlation-id';

/** Generate a new correlation id (`corr_<uuid>`). */
export function newCorrelationId(): string {
  return `corr_${randomUUID()}`;
}

/**
 * Resolve the correlation id for an incoming request: prefer the header,
 * otherwise mint a new one. Invariants are validated by tests.
 */
export function resolveCorrelationId(headerValue: string | null | undefined): string {
  if (headerValue && isValidCorrelationId(headerValue)) {
    return headerValue;
  }
  return newCorrelationId();
}

export function isValidCorrelationId(value: string): boolean {
  // Accept either our `corr_<uuid>` format or a bare uuid for resilience.
  return (
    /^corr_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

export const CORRELATION_HEADER = HEADER;

/** Structured log entry with redaction-friendly fields. */
export interface LogEntry {
  readonly level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  readonly message: string;
  readonly correlationId?: string;
  readonly [key: string]: unknown;
}

/**
 * Minimal structured logger. Real A4 work adds OpenTelemetry traces/metrics;
 * this is the baseline contract so modules can emit structured, redacted logs
 * from day one.
 */
export function log(entry: LogEntry): void {
  // Drop anything below the configured threshold instead of relabeling it info.
  if (!shouldLog(entry.level)) return;
  // Never log raw env values; callers pass structured fields.
  const payload = { ...entry, pid: process.pid, ts: new Date().toISOString() };
  const sink = entry.level === 'error' || entry.level === 'warn' ? entry.level : 'log';

  console[sink](JSON.stringify(payload));
}

const ORDER: Record<LogEntry['level'], number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

function shouldLog(level: LogEntry['level']): boolean {
  const configured = (process.env.LOG_LEVEL ?? 'info') as LogEntry['level'];
  return ORDER[level] >= (ORDER[configured] ?? ORDER.info);
}
