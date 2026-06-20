/**
 * Provider result and error model.
 *
 * Reads return a `ProviderResult<T>`; order submission returns its own
 * `OrderSubmitOutcome` because the ambiguous-timeout case is not a simple
 * success/failure — it requires reconciliation, never a resubmit (integration
 * doc §8, state-machines.md §4).
 *
 * Errors are provider-neutral and redacted: a stable `kind`, a human-safe
 * `message` (never a raw provider payload, token, or stack), and an explicit
 * `retryable` flag. The kinds map onto the sanitized API error codes in
 * shared/validation (POS_UNAVAILABLE, RATE_LIMITED, ...).
 */

import type { ProviderOrderReference } from './refs';

export type ProviderErrorKind =
  | 'unavailable' // provider unreachable / degraded → POS_UNAVAILABLE
  | 'unauthorized' // token missing, expired, or rejected
  | 'rate_limited' // throttled → RATE_LIMITED
  | 'not_found' // unknown reference
  | 'invalid'; // provider rejected the request as malformed/illegal

export interface ProviderError {
  readonly kind: ProviderErrorKind;
  /** Redacted, log-safe explanation. Never contains payloads or secrets. */
  readonly message: string;
  readonly retryable: boolean;
}

export type ProviderResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ProviderError };

export function ok<T>(value: T): ProviderResult<T> {
  return { ok: true, value };
}

export function err<T>(error: ProviderError): ProviderResult<T> {
  return { ok: false, error };
}

/**
 * Outcome of an order submission. Each variant maps 1:1 to a POS-submission
 * state (state-machines.md §4):
 *
 * - `acknowledged`         → `confirmed`
 * - `retryable_failure`    → `retryable_failure` (retry the SAME key)
 * - `confirmation_unknown` → `confirmation_unknown` (reconcile only, never resubmit)
 * - `rejected`             → `rejected` (human resolution)
 */
export type OrderSubmitOutcome =
  | { readonly status: 'acknowledged'; readonly reference: ProviderOrderReference }
  | { readonly status: 'retryable_failure'; readonly error: ProviderError }
  | { readonly status: 'confirmation_unknown'; readonly detail: string }
  | { readonly status: 'rejected'; readonly error: ProviderError };
