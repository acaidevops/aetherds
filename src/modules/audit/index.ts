/**
 * Public surface for the audit module (ADR 0004).
 *
 * Cross-module imports MUST use this barrel. The repository implementation and
 * domain internals are not exported here; dependency-cruiser enforces the
 * boundary (`no-cross-module-infrastructure:audit`, `no-cross-module-domain:audit`).
 *
 * Callers record events through {@link recordAuditEvent}, which derives
 * scope/actor/correlation from the server request context — never from input.
 */

export {
  recordAuditEvent,
  __setDefaultAuditRepoFactoryForTests,
} from './application/record-audit-event';
export type { AuditEventInput, RecordAuditEventDeps } from './application/record-audit-event';
export type { AuditEventRepository } from './application/audit-event-repository';

export { createAuditEvent } from './domain/audit-event';
export type {
  AuditEvent,
  AuditEventOutcome,
  AuditEventBeforeAfter,
  CreateAuditEventInput,
} from './domain/audit-event';
