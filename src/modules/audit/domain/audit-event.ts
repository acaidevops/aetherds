import { randomUUID } from 'node:crypto';

import type { RequestActor } from '@/shared/observability';

/**
 * Append-only audit event (A4, security-privacy.md §7).
 *
 * "Audit logs are append-only and include actor, action, timestamp, scope,
 * reason, correlation ID, and before/after references." This value object
 * captures exactly those fields. It is a business fact, not a free-form log
 * line: persistence is immutable (see migration 00000000000003), and `before`/
 * `after` are opaque REFERENCES (ids, state pointers, version numbers) — never
 * full payloads, so prohibited content cannot leak through the audit trail.
 */

export type AuditEventOutcome = 'success' | 'failure';

/** Opaque before/after references (ids/versions); never a full payload. */
export type AuditEventBeforeAfter = Record<string, unknown>;

export interface AuditEvent {
  readonly id: string;
  /** UTC ISO-8601. */
  readonly occurredAt: string;
  readonly actor: RequestActor;
  /** Absent for platform-wide events (e.g. platform_operator). */
  readonly restaurantId: string | null;
  readonly locationId: string | null;
  /** Stable action code, e.g. `order.approved`, `platform.accessed`. */
  readonly action: string;
  readonly reason: string | null;
  readonly correlationId: string;
  readonly outcome: AuditEventOutcome;
  readonly before: AuditEventBeforeAfter | null;
  readonly after: AuditEventBeforeAfter | null;
}

export interface CreateAuditEventInput {
  readonly actor: RequestActor;
  readonly correlationId: string;
  readonly action: string;
  readonly outcome: AuditEventOutcome;
  readonly restaurantId?: string | null;
  readonly locationId?: string | null;
  readonly reason?: string | null;
  readonly before?: AuditEventBeforeAfter | null;
  readonly after?: AuditEventBeforeAfter | null;
}

/**
 * Construct a frozen, invariant-checked audit event. Mints id and timestamp;
 * validates the fields the audit trail cannot do without. Callers
 * ({@link ../application/record-audit-event}) derive scope/actor/correlation
 * from the server request context, never from client input.
 */
export function createAuditEvent(input: CreateAuditEventInput): AuditEvent {
  if (!input.action) {
    throw new Error('AuditEvent requires an action.');
  }
  if (!input.correlationId) {
    throw new Error('AuditEvent requires a correlationId.');
  }
  if (!input.actor?.id || !input.actor?.type) {
    throw new Error('AuditEvent requires an actor { type, id }.');
  }

  return Object.freeze({
    id: randomUUID(),
    occurredAt: new Date().toISOString(),
    actor: input.actor,
    restaurantId: input.restaurantId ?? null,
    locationId: input.locationId ?? null,
    action: input.action,
    reason: input.reason ?? null,
    correlationId: input.correlationId,
    outcome: input.outcome,
    before: input.before ?? null,
    after: input.after ?? null,
  });
}
