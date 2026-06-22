import 'server-only';

import { getServerSupabaseClient } from '@/shared/db';

import type { AuditEvent } from '../domain/audit-event';
import type { AuditEventRepository } from '../application/audit-event-repository';

/**
 * Supabase implementation of {@link AuditEventRepository} (A4).
 *
 * Writes to the append-only `audit_events` table using the server service-role
 * client (ADR 0010/0011). RLS is bypassed by the service identity, so
 * append-only enforcement rests on the table's `BEFORE UPDATE OR DELETE` trigger
 * (migration 00000000000002) — not on RLS. The error message carries the action
 * code only, never a payload, so a failed insert never leaks audited content.
 */

export class SupabaseAuditEventRepository implements AuditEventRepository {
  async insert(event: AuditEvent): Promise<AuditEvent> {
    const client = getServerSupabaseClient();
    const { error } = await client.from('audit_events').insert({
      id: event.id,
      occurred_at: event.occurredAt,
      actor_type: event.actor.type,
      actor_id: event.actor.id,
      restaurant_id: event.restaurantId,
      location_id: event.locationId,
      action: event.action,
      reason: event.reason,
      correlation_id: event.correlationId,
      outcome: event.outcome,
      before_ref: event.before,
      after_ref: event.after,
    });

    if (error) {
      throw new Error(`Failed to insert audit event (action=${event.action}).`, { cause: error });
    }
    return event;
  }
}
