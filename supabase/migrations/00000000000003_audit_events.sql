-- A4: append-only audit events (security-privacy.md §7; retention §12: 1 year).
--
-- "Audit logs are append-only and include actor, action, timestamp, scope,
-- reason, correlation ID, and before/after references." This table is the
-- durable audit trail; the application service in src/modules/audit writes to it
-- via the service-role client, deriving scope/actor/correlation from the server
-- request context (never client input — ADR 0010).
--
-- Append-only AND write-restricted:
--   1. Privilege: authenticated/anon get only SELECT — NO INSERT/UPDATE/DELETE.
--      Audit rows are written exclusively by the service-role server command
--      (recordAuditEvent), so a client can never forge an audit record (wrong
--      actor, fabricated outcome, etc.). The service role bypasses RLS but is
--      still bound by the immutability trigger below.
--   2. A BEFORE UPDATE OR DELETE trigger that raises for EVERY role — including
--      the service role and table owner, which bypass RLS. RLS bypass does not
--      skip triggers, so this is the authoritative immutability guarantee.
--
-- The read model is asymmetric (security-privacy.md §7): platform_operator reads
-- all audit rows; a tenant member reads only its own restaurant's rows; anon
-- reads none. This is intentionally a hand-written policy, NOT the generic
-- app.enable_tenant_rls helper: that helper emits UPDATE/DELETE policies audit
-- must not have, assumes a location_id FK relationship audit does not require,
-- and cannot express the "tenant reads own / platform reads all / no tenant
-- writes" shape. (restaurants/locations likewise hand-write their root policies.)

-- ---------------------------------------------------------------------------
-- audit_events: append-only actor/action/correlation records.
-- ---------------------------------------------------------------------------

create table if not exists audit_events (
  id             uuid        primary key default gen_random_uuid(),
  occurred_at    timestamptz not null default now(),
  actor_type     text        not null check (actor_type in ('user', 'service', 'system')),
  actor_id       text        not null,
  restaurant_id  uuid        references restaurants(id),
  location_id    uuid        references locations(id),
  action         text        not null,
  reason         text        ,
  correlation_id text        not null,
  outcome        text        not null check (outcome in ('success', 'failure')),
  before_ref     jsonb       ,
  after_ref      jsonb
);

create index if not exists idx_audit_events_occurred_at    on audit_events (occurred_at desc);
create index if not exists idx_audit_events_restaurant_id  on audit_events (restaurant_id);
create index if not exists idx_audit_events_correlation_id on audit_events (correlation_id);
create index if not exists idx_audit_events_action         on audit_events (action);

-- Append-only: no updated_at column, no app.set_updated_at trigger.

alter table audit_events enable row level security;

-- ---------------------------------------------------------------------------
-- Immutability trigger (defense-in-depth; the real enforcement).
-- Fires for every role regardless of RLS bypass. `check_violation` is the
-- stable errcode the integration test asserts on.
-- ---------------------------------------------------------------------------
create or replace function app.audit_events_immutable()
returns trigger
language plpgsql
set search_path = app, public
as $$
begin
  raise exception 'audit_events is append-only (action: %)', tg_op
    using errcode = 'check_violation';
end;
$$;

create trigger trg_audit_events_immutable
  before update or delete on audit_events
  for each row execute function app.audit_events_immutable();

-- ---------------------------------------------------------------------------
-- Row-Level Security (ADR 0010 / 0012).
-- READ: platform_operator sees all; a tenant member sees only its own
--       restaurant_id. No select policy matches anon -> deny by default.
-- WRITE: NO insert/update/delete policy. Clients cannot write audit rows at all
--        — the audit trail must be unforgeable, so the only writer is the
--        service-role server command (which bypasses RLS). The immutability
--        trigger then prevents even that writer from mutating existing rows.
-- ---------------------------------------------------------------------------
create policy audit_events_tenant_read on audit_events
  for select
  using (
        restaurant_id = app.current_restaurant_id()
    or  app.current_role() = 'platform_operator'
  );

-- ---------------------------------------------------------------------------
-- Privileges.
-- Client-reachable roles may SELECT only. INSERT is deliberately NOT granted:
-- audit writes are service-role-only so a tenant member cannot forge records.
-- UPDATE/DELETE are withheld too, and the immutability trigger blocks them for
-- every role including the service role / table owner.
-- ---------------------------------------------------------------------------
grant usage on schema app to authenticated, anon;
grant select on audit_events to authenticated, anon;

-- Retention (security-privacy.md §12: 1 year for security/privilege/menu-safety/
-- order-change audit) is enforced by a future scheduled purge job per ADR 0011.
-- No scheduler exists at MVP; documented here, not implemented in this migration.
