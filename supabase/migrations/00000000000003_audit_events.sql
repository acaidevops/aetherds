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
--   2. BEFORE UPDATE OR DELETE (row) and BEFORE TRUNCATE (statement) triggers
--      that raise for EVERY role — including the service role and table owner,
--      which bypass RLS. RLS bypass does not skip triggers, so these are the
--      authoritative immutability guarantee (UPDATE/DELETE/TRUNCATE all blocked).
--
-- The read model is asymmetric (security-privacy.md §7): platform_operator reads
-- all audit rows; an owner/manager reads only its own restaurant's rows (audit
-- is a restaurant-wide oversight tool); servers/food-safety and anon read none.
-- This is intentionally a hand-written policy, NOT the generic
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

-- TRUNCATE is neither UPDATE nor DELETE and does NOT fire row-level triggers, so
-- without this a privileged/service-role process could wipe the entire trail
-- while UPDATE/DELETE stay blocked. TRUNCATE triggers must be FOR EACH STATEMENT;
-- the same function raises (tg_op = 'TRUNCATE'), closing the immutability hole.
create trigger trg_audit_events_immutable_truncate
  before truncate on audit_events
  for each statement execute function app.audit_events_immutable();

-- ---------------------------------------------------------------------------
-- Row-Level Security (ADR 0010 / 0012).
-- READ is an OVERSIGHT capability, restaurant-wide and role-restricted:
--   * platform_operator sees all rows (audited support);
--   * owner/manager see their own restaurant's rows — INTENTIONALLY at the
--     restaurant level, not sub-scoped by location: oversight spans the whole
--     restaurant and many audit rows are restaurant-level (location_id IS NULL),
--     which a location predicate would hide. Servers/food-safety roles get no
--     audit read (they have no oversight need), so a server cannot browse the
--     trail of other staff/locations.
--   * anon (unauthenticated) gets no read at all — no SELECT grant below.
-- WRITE: NO insert/update/delete policy. Clients cannot write audit rows at all
--        — the audit trail must be unforgeable, so the only writer is the
--        service-role server command (which bypasses RLS). The immutability
--        triggers then prevent even that writer from mutating or truncating rows.
-- ---------------------------------------------------------------------------
create policy audit_events_oversight_read on audit_events
  for select
  using (
        app.current_role() = 'platform_operator'
    or  (
          restaurant_id = app.current_restaurant_id()
      and app.current_role() in ('owner', 'manager')
    )
  );

-- ---------------------------------------------------------------------------
-- Privileges.
-- Only `authenticated` gets SELECT (RLS then restricts to oversight roles);
-- `anon` is granted nothing so an unauthenticated client cannot even probe the
-- table. INSERT is deliberately NOT granted: audit writes are service-role-only
-- so a tenant member cannot forge records. UPDATE/DELETE/TRUNCATE are withheld
-- too, and the immutability triggers block them for every role including the
-- service role / table owner.
-- ---------------------------------------------------------------------------
grant usage on schema app to authenticated;
grant select on audit_events to authenticated;

-- Retention (security-privacy.md §12: 1 year for security/privilege/menu-safety/
-- order-change audit) is enforced by a future scheduled purge job per ADR 0011.
-- No scheduler exists at MVP; documented here, not implemented in this migration.
