# Architecture Decision Records

| ADR | Decision |
|---|---|
| [0001](0001-digital-server-not-pos.md) | AETHER is a digital hospitality server, not the POS |
| [0002](0002-spoton-authority.md) | SpotOn owns transactional and kitchen truth |
| [0003](0003-human-order-approval.md) | Human approval is required for every order |
| [0004](0004-modular-monolith.md) | MVP uses a modular monolith |
| [0005](0005-durable-outbox.md) | POS integration uses PostgreSQL outbox and idempotent jobs |
| [0006](0006-menu-ownership.md) | SpotOn menu facts and AETHER enrichment are separated |
| [0007](0007-ai-boundaries.md) | AI is bounded, grounded, and non-authoritative |
| [0008](0008-anonymous-sessions.md) | Guest sessions are anonymous and table-bound |
| [0009](0009-no-offline-writes.md) | Transactional offline writes are prohibited |
| [0010](0010-tenant-isolation.md) | Tenant isolation is database-enforced |
| [0011](0011-worker-runtime-and-scheduling.md) | Supabase Edge Functions process the PostgreSQL outbox with wake-up and scheduled recovery |
| [0012](0012-rls-mechanism.md) | Row-Level Security reads tenant scope from the JWT claims GUC, denies by default, and is testable in plain PostgreSQL |
| [0013](0013-observability-and-audit.md) | OpenTelemetry traces/metrics, redacted context-aware logging, and a trigger-enforced append-only audit trail |

ADRs are immutable historical records. To change a decision, add a new ADR that supersedes the old one.

New ADRs use the metadata and sections in
[the ADR template](template.md). Existing ADRs were formalized on
2026-06-18; their decision date may predate that documentation date.

