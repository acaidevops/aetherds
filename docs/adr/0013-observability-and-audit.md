# ADR 0013: OpenTelemetry Telemetry and Append-Only Audit

Status: Accepted
Date documented: 2026-06-21
Decision owners: Avinash (technical), Anil (operations)
Supersedes: None
Superseded by: None

## Context

A4 (observability and audit foundation) must deliver four outcomes: correlation
ids across API and jobs, structured redacted logging, metrics/traces for the
core command path, and an append-only audit event service. ADR 0011 names
telemetry requirements (queue age, claim/execution latency, attempts, outcomes,
dead letters, correlation across session→batch→approval→outbox→attempt→reconciliation)
and security-privacy.md §7/§12 require redacted logs and a 1-year append-only
audit trail.

The existing baseline (`src/shared/observability/correlation.ts`) mints/resolves
correlation ids and has a level-gated console logger, but no tracing, metrics,
or audit persistence.

## Decision drivers

- One telemetry surface for routes, workers, and scheduled jobs
- No required infrastructure beyond the Supabase/Vercel stack (ADR 0011 minimalism)
- Build must not depend on runtime secrets or a collector (the env-validation
  failure that broke the Vercel build must not recur)
- Audit is immutable and tenant-isolated, yet readable for support and incident review

## Considered alternatives

### Thin OTel-ready seam (no-op/log sink), adopt later

Rejected for traces/metrics. The backlog criterion ("metrics/traces for core
command path") is satisfied more honestly by real spans and histograms now, and
the seam's no-op default does not exercise exporter plumbing.

### `@vercel/otel` auto-registration

Rejected. It is Vercel-coupled, auto-registers instrumentations we do not want
yet, and removes the console fallback that local/CI depend on. One portable
code path (local, CI, Vercel) is preferred.

### `pino` for structured logging

Rejected. The hand-rolled logger already passes the unit gate; a redaction layer
plus a context-aware child logger meet §7 without a new dependency.

### Enforce append-only via RLS alone

Rejected. The service role bypasses RLS, so RLS cannot guarantee immutability.
A `BEFORE UPDATE OR DELETE` trigger is required; revoking UPDATE/DELETE from
client roles is defense-in-depth.

### Use the generic `app.enable_tenant_rls` helper for audit_events

Rejected. The helper emits UPDATE/DELETE policies audit must not have, assumes a
`location_id` FK relationship audit does not require, and cannot express the
"tenant reads own / platform reads all / no tenant writes" read model. Audit
uses a hand-written policy, like `restaurants`/`locations` do for root tables.

## Decision

1. **OpenTelemetry SDK** (`@opentelemetry/api` + `sdk-node` + OTLP/HTTP exporters
   + `sdk-trace-base`/`sdk-metrics` for console fallback and in-memory test
   exporters) is initialized in `instrumentation.ts`. Auto-instrumentations are
   deliberately excluded; the command path is wrapped manually with `withSpan`.
2. **Build/edge safety.** `register()` returns early during `phase-production-build`
   and when `NEXT_RUNTIME !== 'nodejs'`. All SDK packages are dynamically imported
   inside `register`, and OTel reads `process.env` directly (never `serverEnv`), so
   importing the module at build time has no side effect and adds no required env var.
3. **Exporter selection.** When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, traces and
   metrics export over OTLP/HTTP; otherwise both use console exporters, so the app
   runs with zero telemetry config (local, CI).
4. **Correlation via `AsyncLocalStorage`.** A `RequestContext` (correlation id,
   tenant scope, actor) is established by `withRequestObservability` and read by the
   logger, metrics, traces, and audit service without threading it through every
   signature.
5. **Redacting child logger.** The existing `log()` sink is wrapped by `createLogger`,
   which auto-attaches correlation/scope from the context and runs every entry
   through `redact()` (§7 prohibited fields), preserving allowed opaque ids.
6. **Append-only audit.** `audit_events` (migration 00000000000003) records actor,
   action, scope, reason, correlation id, outcome, and opaque before/after
   references. Immutability is enforced by a `BEFORE UPDATE OR DELETE` trigger
   (`check_violation`) that fires for every role including the service role, plus
   revoked UPDATE/DELETE privileges. RLS: platform_operator reads all; a tenant
   reads only its own `restaurant_id`; anon reads none.
7. **Application service derives scope from context.** `recordAuditEvent` takes only
   business fields (action, outcome, reason, references) and derives
   correlation/actor/scope from the server request context — never from input.

## Consequences

- One telemetry provider spans routes and (future) workers; swapping exporters is
  config, not code.
- `next build` stays free of runtime-secret and collector dependencies.
- The audit trail is tamper-evident: even a buggy or privileged service call cannot
  edit or delete a record.
- Manual span wrapping (not auto-instrumentation) keeps the instrumented surface
  small and Turbopack-safe; the full session→outbox trace is wired as those epics land.
- 1-year retention is a future scheduled purge job (ADR 0011); no scheduler exists yet.

## Verification

- Unit: correlation-context propagation; redaction of prohibited fields with opaque
  ids preserved; child-logger auto-scope and level gating; `withSpan` produces spans
  and records exceptions (in-memory exporter); `recordRequestDuration` emits the
  histogram; `recordAuditEvent` derives scope from context and ignores client scope.
- Integration (`tests/integration/db/audit-events.test.ts`): UPDATE/DELETE rejected
  with `check_violation` even for the service/owner role; tenant reads own rows only;
  platform_operator reads all; anon reads none; cross-tenant INSERT rejected.
- Build: `npm run build` passes with placeholder env and no OTel endpoint (build
  phase skips SDK init).

## References

- [ADR 0005](0005-durable-outbox.md) — durable outbox (correlation consumers)
- [ADR 0010](0010-tenant-isolation.md) — tenant isolation
- [ADR 0011](0011-worker-runtime-and-scheduling.md) — worker telemetry requirements
- [ADR 0012](0012-rls-mechanism.md) — RLS mechanism
