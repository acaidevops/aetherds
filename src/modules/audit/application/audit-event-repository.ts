import type { AuditEvent } from '../domain/audit-event';

/**
 * Persistence port for audit events (ADR 0004).
 *
 * Owned by the application layer; the Supabase implementation lives in
 * `infrastructure/` and is injected or late-bound. Keeping the port in its own
 * module lets infrastructure import it without depending back on the application
 * service, avoiding a module-internal dependency cycle.
 */
export interface AuditEventRepository {
  insert(event: AuditEvent): Promise<AuditEvent>;
}
