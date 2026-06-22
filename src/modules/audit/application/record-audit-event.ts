import { getRequestContext, type RequestContext } from '@/shared/observability';

import type { AuditEventRepository } from './audit-event-repository';
import { createAuditEvent, type AuditEvent, type AuditEventOutcome } from '../domain/audit-event';

/**
 * Application service: record an audit event (ADR 0004, A4).
 *
 * Routes call THIS, not the repository directly. The service derives
 * `correlationId`, tenant scope, and actor from the server {@link RequestContext}
 * (or an injected one for tests) — never from `input`. This enforces ADR 0010:
 * nothing client-supplied can fake the scope or correlation of an audit record.
 *
 * The caller supplies only the business-meaningful fields: `action`, `outcome`,
 * `reason`, and opaque before/after references.
 */

/** Business input only — scope/actor/correlation come from the server context. */
export interface AuditEventInput {
  readonly action: string;
  readonly outcome: AuditEventOutcome;
  readonly reason?: string | null;
  readonly before?: AuditEvent['before'];
  readonly after?: AuditEvent['after'];
}

/**
 * Persistence port: see {@link AuditEventRepository} (./audit-event-repository).
 * The Supabase implementation is injected (tests) or late-bound (runtime) so the
 * application layer never statically depends on infrastructure.
 */
export interface RecordAuditEventDeps {
  /** Override the repository (tests pass a fake). Defaults to the Supabase impl. */
  readonly repo?: AuditEventRepository;
  /** Override the context (tests). Defaults to the active request context. */
  readonly context?: RequestContext;
}

// Late-bound default repository factory keeps the application layer free of a
// static infrastructure import (and of any build-time side effect). Resolved on
// first use.
let defaultRepoFactory: () => Promise<AuditEventRepository> = async () => {
  const { SupabaseAuditEventRepository } =
    await import('../infrastructure/supabase-audit-repository');
  return new SupabaseAuditEventRepository();
};

/** Test-only hook to replace the default repository factory. */
export function __setDefaultAuditRepoFactoryForTests(
  factory: () => Promise<AuditEventRepository>,
): () => void {
  const original = defaultRepoFactory;
  defaultRepoFactory = factory;
  return () => {
    defaultRepoFactory = original;
  };
}

export async function recordAuditEvent(
  input: AuditEventInput,
  deps: RecordAuditEventDeps = {},
): Promise<AuditEvent> {
  const ctx = deps.context ?? getRequestContext();
  if (!ctx) {
    // Audit without correlation/actor cannot be trusted; fail loudly rather than
    // write an unattributable record.
    throw new Error('recordAuditEvent requires a request context (or injected deps.context).');
  }

  const event = createAuditEvent({
    actor: ctx.actor,
    restaurantId: ctx.restaurantId ?? null,
    locationId: ctx.locationId ?? null,
    correlationId: ctx.correlationId,
    action: input.action,
    outcome: input.outcome,
    reason: input.reason ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
  });

  const repo = deps.repo ?? (await defaultRepoFactory());
  return repo.insert(event);
}
