-- A4: append-only audit events (security-privacy.md §7; retention §12: 1 year).
--
-- "Audit logs are append-only and include actor, action, timestamp, scope,
-- reason, correlation ID, and before/after references." This table is the
-- durable audit trail; the application service in src/modules/audit writes to it
-- via the service-role client, deriving scope/actor/correlation from the server
-- request context (never client input — ADR 0010).
--
-- Append-only is enforced by TWO independent layers:
--   1. Privilege: authenticated/anon get only SELECT, INSERT (no UPDATE/DELETE).
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
-- INSERT: constrain tenant scope on insert (defense-in-depth; writes normally
--         arrive via the service role, which bypasses RLS). Platform-wide rows
--         (null restaurant_id) are insertable only by platform_operator.
-- UPDATE/DELETE: no policy -> RLS denies for tenant roles; the trigger above
--                denies for everyone.
-- ---------------------------------------------------------------------------
create policy audit_events_tenant_read on audit_events
  for select
  using (
        restaurant_id = app.current_restaurant_id()
    or  app.current_role() = 'platform_operator'
  );

create policy audit_events_tenant_insert on audit_events
  for insert
  with check (
        (restaurant_id = app.current_restaurant_id())
    or  app.current_role() = 'platform_operator'
  );

-- ---------------------------------------------------------------------------
-- Privileges.
-- Client-reachable roles may INSERT and SELECT only; UPDATE/DELETE are withheld
-- so append-only holds at the privilege layer too. The service role (table owner
-- in CI, service-role identity in Supabase) writes through RLS bypass and is
-- still bound by the immutability trigger.
-- ---------------------------------------------------------------------------
grant usage on schema app to authenticated, anon;
grant select, insert on audit_events to authenticated, anon;

-- Retention (security-privacy.md §12: 1 year for security/privilege/menu-safety/
-- order-change audit) is enforced by a future scheduled purge job per ADR 0011.
-- No scheduler exists at MVP; documented here, not implemented in this migration.
