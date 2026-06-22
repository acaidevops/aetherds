# Engineering Guide

## 1. Baseline stack

- Next.js 16
- React 19
- TypeScript with strict mode
- Tailwind CSS
- shadcn/ui primitives with AETHER-specific design tokens
- Supabase Auth, PostgreSQL, Realtime, Storage
- Vercel
- OpenAI API

Exact package versions should be pinned when the application is scaffolded and updated deliberately.

## 2. Repository structure

```text
app/
  (guest)/
  (staff)/
  (admin)/
  api/v1/
src/
  modules/
    identity/
    devices/
    sessions/
    guest-preferences/
    menu-sync/
    menu-enrichment/
    recommendations/
    cart/
    orders/
    spoton/
    service-requests/
    staff-operations/
    feedback/
    analytics/
    platform-operations/
    audit/
  shared/
    auth/
    db/
    events/
    money/
    observability/
    validation/
supabase/
  functions/
    outbox-worker/
    reconciliation-worker/
  migrations/
  seed/
tests/
  unit/
  integration/
  contract/
  e2e/
docs/
```

The directories above map one-to-one to the logical modules in
[System Architecture](../architecture/system-architecture.md#3-logical-modules).
Do not merge modules merely because they share UI routes or tables. A module
may expose:

```text
<module>/
  domain/          # entities, value objects, policies, state transitions
  application/     # commands, queries, use cases, ports
  infrastructure/  # database repositories and provider adapters
  contracts/       # schemas/events intentionally exposed to other modules
  index.ts          # public module surface
```

Imports from another module must use its public surface. Infrastructure code
must not be imported by another module.

## 3. Module rules

- Domain modules own their tables and state transitions.
- Cross-module changes use application services/domain events.
- Route handlers remain thin.
- Provider payloads stay inside adapters.
- AI output stays outside domain authority.
- No generic repository layer that erases domain intent.

## 4. Database

- Migrations are additive and backward-compatible by default.
- Validate in staging.
- Destructive changes require explicit rollback, backup consideration, off-hours execution, and Avinash approval.
- Use constraints for invariants where possible.
- Use RLS for every client-reachable tenant table.
- Use PostgreSQL advisory/row locks for worker claims and critical transitions.

Migrations live in `supabase/migrations/` and apply via `supabase db push` (real
environments) or `npm run db:migrate` (plain PostgreSQL, used by CI). Tenant
isolation is enforced by the RLS mechanism in
[ADR 0012](../adr/0012-rls-mechanism.md): new tenant-owned tables call
`app.enable_tenant_rls('<table>'::regclass, p_has_location := <bool>)` to get
deny-by-default, per-command policies scoped by `restaurant_id`/`location_id`,
and each carries an automated cross-tenant negative test under
`tests/integration/`.

## 5. Outbox/jobs

- Domain transition and outbox insertion share one transaction.
- Supabase Edge Functions are the initial worker runtime.
- An asynchronous post-commit wake-up reduces latency; Supabase Cron performs
  the authoritative recovery sweep.
- Claims use leases and `FOR UPDATE SKIP LOCKED`.
- SpotOn submissions are serialized per location.
- Workers are idempotent and reuse immutable provider references.
- Attempts and final state are persisted.
- Exponential backoff with bounded retry policy.
- Ambiguous SpotOn results bypass automatic retry and enter reconciliation.
- Dead-letter queue has an operator resolution path.
- Runtime budgets, concurrency, alerts, and failure ownership follow
  [ADR 0011](../adr/0011-worker-runtime-and-scheduling.md).

## 6. Realtime

- Publish minimal invalidation events.
- Clients refetch authoritative projections.
- Include entity/version/correlation metadata.
- Recover through reconnect and bounded polling.
- Never rely on event ordering alone for correctness.

## 7. Observability

Telemetry is OpenTelemetry (ADR 0013). Traces and metrics are initialized in
`instrumentation.ts`, which is gated to skip the production build and the Edge
runtime; it exports over OTLP/HTTP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set and
to the console otherwise, so local and CI run with zero telemetry config.
Application code wraps command paths with `withSpan` and records a
request-duration histogram through the `src/shared/observability` seam rather
than touching the OTel API directly. Correlation id and tenant scope flow
through an `AsyncLocalStorage` request context established by
`withRequestObservability`; the child logger auto-attaches them and redacts the
security-privacy.md §7 prohibited fields.

Trace:

```text
dining session → order batch → approval group → outbox job
→ SpotOn attempt → acknowledgment/reconciliation
```

Audit: privileged and state-changing operations append to `audit_events`
(migration 00000000000002) — actor, action, scope, reason, correlation id,
outcome, and opaque before/after references. The table is append-only by trigger
(fires even for the service role) and tenant-isolated: a platform operator reads
all rows, a tenant reads only its own `restaurant_id`, anon reads none. The
`recordAuditEvent` service derives scope/actor/correlation from the request
context, never from client input. Retention is 1 year (§12), enforced by a
future scheduled job (ADR 0011).

Alert on:

- Submission failures/ambiguity
- Duplicate risk
- Stale menu sync
- Request escalation breach
- Auth anomalies
- Cross-tenant attempts
- Device noncompliance
- AI cost/latency thresholds

## 8. CI/CD

Required blocking checks:

- Formatting/lint
- Type check
- Unit and integration tests
- Migration validation
- Dependency/secret/security scans
- SpotOn adapter contract tests
- Critical end-to-end ordering tests

Production additionally requires Avinash’s technical and Anil’s operational approval. Food-safety behavior requires Anusha.

## 9. Environment rules

- Separate development, staging, and production.
- Never copy production data to lower environments.
- Use synthetic fixtures and redacted provider examples.
- Production access is audited, time-limited break-glass only.
- Deploy production changes outside operating hours.
- Use feature flags and immediate rollback.

## 10. Coding standards

- Model commands and states explicitly.
- Prefer exhaustive discriminated unions for state.
- Never use floating point for money.
- Never trust client timestamps or tenant IDs.
- Validate all external input at boundaries.
- Keep user errors actionable and technical errors protected.
- Add an ADR when changing an authority boundary or major architecture choice.
