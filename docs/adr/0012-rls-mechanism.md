# ADR 0012: Row-Level Security mechanism for tenant isolation

Status: Accepted
Date documented: 2026-06-20
Decision owners: Avinash (technical)
Supersedes: None
Superseded by: None

## Context

ADR 0010 decides that tenant isolation is database-enforced: every tenant-owned
record carries `restaurant_id` (and `location_id` where applicable), scope is
derived from authenticated identity, and Supabase Row Level Security (RLS) backs
the boundary. A3 must turn that decision into a concrete, testable mechanism and
establish the pattern every later module epic reuses.

Two forces shape the mechanism:

- RLS must read tenant scope from the *authenticated identity* (the verified
  JWT), never from client-supplied IDs, so a missed application predicate cannot
  expose another tenant.
- RLS tests must run in CI without standing up the full Supabase stack
(PostgREST, Auth, Docker), or they will be too slow/heavy to gate every PR.

## Decision drivers

- Production faithfulness: the mechanism must be exactly what Supabase enforces,
  not an approximation.
- CI portability: migrations and RLS must validate against plain PostgreSQL.
- Defense in depth: RLS is the backstop; the server remains the authoritative
  authorizer.
- A reusable contract so module epics do not hand-write policy SQL.

## Considered alternatives

### Read scope from `auth.jwt()`

Rejected as the *primary* mechanism. Supabase's `auth.jwt()` is itself a thin
wrapper over the `request.jwt.claims` GUC (`coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)`). Reading that GUC directly is
identical in production but also settable via `set_config(..., true)` in plain
PostgreSQL, which is what makes RLS testable in CI. `auth.jwt()` remains
available inside Supabase; the `app.*` helpers simply do not depend on it.

### Mint real JWTs and test through PostgREST in CI

Rejected. Requires Docker, the Supabase CLI, and PostgREST in CI; slower and
more brittle than a plain `postgres:16` service. The GUC approach exercises the
same Postgres RLS engine with none of that overhead.

### A bespoke migration runner instead of Supabase CLI conventions

Partially accepted. Migration files live under `supabase/migrations/` and apply
via `supabase db push` in real environments (the documented layout), but a
portable runner (`scripts/migrate.ts`) applies the same files to plain Postgres
in CI. Role creation (`authenticated`, `anon`) is bootstrapped by the runner, not
the migration files, so the SQL stays Supabase-pure.

## Decision

1. **Claim source.** Tenant scope is read from the `request.jwt.claims` GUC by
   stable helper functions in the `app` schema: `app.current_restaurant_id()`,
   `app.current_location_id()`, `app.current_role()`, `app.current_device_id()`.
   Each is `language sql stable`, `security invoker`, with `set search_path`
   hardening and an empty-string-safe cast (`nullif(..., '')` before `::jsonb`).

2. **Deny-by-default.** Every tenant table enables RLS. With no matching policy a
   role sees nothing; anonymous (no claims) resolves to NULL scope and is denied.

3. **Reusable helper.** `app.enable_tenant_rls(table, has_location, prefix)`
   enables RLS and creates four per-command policies (select/insert/update/delete),
   each scoped by `restaurant_id` (and `location_id` when applicable) with both
   `USING` and `WITH CHECK` set to the same predicate. Cross-tenant INSERT/UPDATE
   are therefore rejected with a row-level-security **error**, not silently hidden.
   Module epics call this instead of writing policy SQL.

4. **Tenant root and platform access.** `restaurants` and `locations` are the
   tenancy *roots*: a restaurant's identity is its own `id`, and a location's
   identity is its own `id` (there is no `location_id` column on `locations`).
   They therefore use **explicit, id-based policies** rather than the generic
   helper: a member sees the restaurant/location its scope resolves to
   (`restaurant_id = current_restaurant_id()` and, for locations,
   `id = current_location_id()`), and a `platform_operator` sees all rows
   (PostgreSQL ORs permissive policies, so the platform clause is layered on).
   The generic `app.enable_tenant_rls` helper is reserved for *downstream* tables
   that carry both `restaurant_id` and a `location_id` FK to a parent location
   (tables, devices, dining_sessions, …).

5. **Service role bypasses RLS** (intended, defense in depth). The application
   server uses the service-role client (`src/shared/db/client.ts`), which bypasses
   RLS, so RLS protects only client-reachable paths. Server-side authorization
   (`assertScope` in `src/shared/auth/principal.ts`) remains authoritative. The TS
   `Principal` is mapped to claim keys by `tenantClaimsFor`
   (`src/shared/db/claims.ts`), giving server authz and DB RLS one source of truth.

6. **Portability.** Migrations apply identically via `supabase db push` and the
   plain-Postgres runner. Integration tests set `request.jwt.claims` with
   `set_config(..., true)` and `set local role authenticated` so Postgres enforces
   RLS exactly as in production.

## Consequences

- Adding a tenant-owned table is one migration + one `app.enable_tenant_rls` call.
- A future table that forgets `WITH CHECK` is caught by the mandatory cross-tenant
  negative test, which expects an error (not a 0-row effect) on cross-tenant write.
- `pg` is a server/tooling-only dependency (runner + integration tests); ESLint
  forbids importing it from `app/` or `src/`.
- Platform-wide access is an explicit per-table overlay, never a blanket grant.
- The DDL helper `app.enable_tenant_rls` is `SECURITY DEFINER`, so its
  `EXECUTE` privilege is revoked from `PUBLIC`/`authenticated`/`anon` after
  creation; only the migration owner may run it. The claim-reader helpers stay
  `PUBLIC`-executable because RLS evaluates them at query time.

## Verification

- `supabase/migrations/00000000000000_app_schema.sql` defines the `app`
  claim-reader helpers and the reusable `enable_tenant_rls` (with its `EXECUTE`
  privilege revoked from client roles); `00000000000001_tenancy_root.sql`
  defines `restaurants` and `locations` with **explicit id-based root policies**
  plus a `platform_operator` overlay.
- `tests/integration/db/rls-cross-tenant.test.ts` proves: tenant A cannot read,
  insert, update, or delete tenant B's rows; anonymous sees nothing; cross-tenant
  writes raise a row-level-security error; client-provided tenant IDs do not
  expand scope; `platform_operator` reads across tenants; and the reusable
  `enable_tenant_rls` helper isolates a representative downstream table.
- CI (`migrations-and-rls` job) applies migrations to a `postgres:16` service and
  runs the integration suite on every PR.
