-- A4 follow-up (PR #67 review finding): close the TRUNCATE gap in audit_events
-- immutability.
--
-- The original guard (00000000000003) is a BEFORE UPDATE OR DELETE row trigger.
-- Row triggers do not fire on TRUNCATE, so a privileged role that can issue
-- TRUNCATE (the Supabase service_role can typically TRUNCATE public-schema
-- tables; so can the table owner) could wipe the entire audit trail while
-- UPDATE/DELETE stayed blocked — contradicting the "append-only for every role"
-- claim in ADR 0013.
--
-- This adds a statement-level BEFORE TRUNCATE trigger that reuses the existing
-- app.audit_events_immutable() function: that function raises `check_violation`
-- with message 'audit_events is append-only (action: <tg_op>)', and for a
-- TRUNCATE trigger tg_op is 'TRUNCATE'. No new function is needed; the function
-- reads only tg_op, so it is valid for statement-level use.

drop trigger if exists trg_audit_events_immutable_truncate on audit_events;

create trigger trg_audit_events_immutable_truncate
  before truncate on audit_events
  for each statement execute function app.audit_events_immutable();
