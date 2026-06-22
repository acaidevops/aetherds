import { AsyncLocalStorage } from 'node:async_hooks';

import { isValidCorrelationId } from './correlation';

/**
 * Request-scoped observability context (A4).
 *
 * Per api-contracts.md §1 every request carries a correlation id; workers
 * propagate it across the outbox → provider → reconciliation chain (ADR 0011).
 * Rather than thread the id through every signature, we keep it (plus tenant
 * scope and actor) in an {@link AsyncLocalStorage} so the logger, metrics,
 * traces, and audit service can read it uniformly. Modules stay decoupled from
 * the transport that carried the request.
 *
 * Tenant scope (restaurant/location) is resolved server-side from authenticated
 * membership/device context in later epics; it is absent here until then, which
 * is correct — nothing client-supplied is ever trusted (ADR 0010).
 */

export type RequestActorType = 'user' | 'service' | 'system';

/**
 * The actor that caused an event. Opaque id (a user id, a service identity, or
 * 'system' for scheduler/runtime-initiated work). Never carries credentials.
 */
export interface RequestActor {
  readonly type: RequestActorType;
  readonly id: string;
}

export interface RequestContext {
  /** Validated `corr_<uuid>` correlation id (api-contracts.md §1). */
  readonly correlationId: string;
  /** Tenant root scope; absent for platform-wide work (e.g. platform_operator). */
  readonly restaurantId?: string;
  /** Location scope within the restaurant when applicable. */
  readonly locationId?: string;
  readonly actor: RequestActor;
  /** Stable route label, e.g. `GET /api/v1/operations/system-health`. */
  readonly route?: string;
  readonly method?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Run `fn` inside a request context so nested async callees see it via
 * {@link getRequestContext}. Throws on an invalid correlation id rather than
 * silently propagating a bad value through logs/traces/audit.
 */
export function withRequestContext<T>(
  ctx: RequestContext,
  fn: () => Promise<T> | T,
): Promise<T> | T {
  if (!isValidCorrelationId(ctx.correlationId)) {
    // Never echo arbitrary input verbatim if it could be huge; correlation ids
    // are short, so this is safe and keeps the error actionable.
    throw new Error(`Refusing to enter request context with invalid correlation id.`);
  }
  return storage.run(ctx, fn);
}

/** The context for the current async chain, or `undefined` when none is active. */
export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/** Convenience: the current correlation id, if a context is active. */
export function getCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}
