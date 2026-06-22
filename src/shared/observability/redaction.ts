/**
 * Structured-log redaction (A4) implementing security-privacy.md §7.
 *
 * The §7 PROHIBITED list (never leave the server in a log line):
 * credentials/tokens, payment data, full guest free text, full allergy details,
 * raw AI prompts/responses, and provider payloads with unnecessary data.
 *
 * The §7 ALLOWED list (safe to log): correlation ids and tenant/location/device
 * opaque ids, state transitions, provider status/category, latency/retry and a
 * redacted error code. The deny list below is deliberately shaped so it does
 * NOT swallow those allowed opaque ids (`restaurant_id`, `location_id`,
 * `device_id`, `session_id`) — they survive redaction so traces stay usable.
 *
 * This is a best-effort structural guard, not a complete data-classification
 * engine: callers remain responsible for not passing sensitive prose in
 * arbitrary fields. It is the safety net beneath that discipline.
 */

const REDACTED = '[REDACTED]';

/**
 * Keys whose values are removed. Case-insensitive substring match against the
 * full key path segment. `session` is intentionally absent: opaque session ids
 * are allowed, and a key literally named `session` usually holds the allowed id.
 */
const DENY_KEY =
  /(password|passwd|secret|token|api[_-]?key|authorization|credential|private[_-]?key|payment|card|cvv|cvc|pan|allerg|prompt|response|payload)/i;

/**
 * Leaf string values that match a sensitive shape are redacted regardless of
 * key: bearer tokens, JWTs, and Stripe-style card/payment tokens.
 */
const DENY_VALUE: readonly RegExp[] = [
  /^Bearer\s+\S/i,
  /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, // JWT
  /^(tok|pm|card)_[A-Za-z0-9]+/, // Stripe-style tokens / payment methods
];

/**
 * Secret shapes scrubbed even when EMBEDDED inside a larger string (e.g. a
 * free-form `reason` or a string nested in before/after). These complement
 * DENY_VALUE, which only matches whole-string values. Global flag so every
 * occurrence is replaced. This is best-effort, high-confidence pattern matching
 * — not a general PII detector; callers must still avoid passing sensitive prose.
 */
const EMBEDDED_SECRET: readonly RegExp[] = [
  /Bearer\s+\S+/gi, // authorization headers
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // JWT anywhere
  /\b(?:sk|pk|rk|tok|pm|card)_[A-Za-z0-9]+/g, // provider/Stripe tokens
  // key=value / key: value secret assignments
  /\b(?:password|passwd|secret|token|api[_-]?key|authorization|credential)\b\s*[=:]\s*\S+/gi,
];

function scrubEmbeddedSecrets(value: string): string {
  return EMBEDDED_SECRET.reduce((acc, re) => acc.replace(re, REDACTED), value);
}

/**
 * Deep-clone `value`, replacing sensitive keys and values with `'[REDACTED]'`.
 * Never mutates the input. Plain objects/arrays are reconstructed; everything
 * else (primitives, null) is passed through after the value-shape check.
 */
export function redact<T>(value: T): T {
  return walk(value) as T;
}

function walk(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(walk);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = DENY_KEY.test(key) ? REDACTED : walk(child);
    }
    return out;
  }
  if (typeof value === 'string') {
    if (DENY_VALUE.some((re) => re.test(value))) return REDACTED;
    return scrubEmbeddedSecrets(value);
  }
  return value;
}

/**
 * Reduce an arbitrary thrown value to log-safe metadata: a stable error TYPE and
 * (when present) a short, stable error CODE — never the raw `message`.
 *
 * Key-based {@link redact} cannot inspect sensitive substrings inside a free-form
 * error string, and database/provider errors routinely embed payloads,
 * credentials, allergy details, or prompts in their messages. So we never log
 * `err.message`; we log the class name and a code (SQLSTATE, ApiError code,
 * provider error code), which are stable and non-sensitive.
 */
export function sanitizeError(err: unknown): { errorType: string; errorCode?: string | number } {
  if (err instanceof Error) {
    const errorType = err.name && err.name !== 'Error' ? err.name : err.constructor.name;
    const code = (err as { code?: unknown }).code;
    return typeof code === 'string' || typeof code === 'number'
      ? { errorType, errorCode: code }
      : { errorType };
  }
  return { errorType: typeof err };
}
