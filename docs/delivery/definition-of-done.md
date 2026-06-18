# Definition of Done

A work item is done only when all applicable criteria are satisfied.

## Product

- Acceptance criteria pass.
- Empty/error/loading/degraded states are defined.
- Human fallback remains clear.
- Analytics events avoid unnecessary sensitive data.

## Domain and API

- State transition and authorization are explicit.
- Concurrency/idempotency behavior is tested.
- Tenant/location scope is server-derived.
- Audit requirements are implemented.
- Error codes are stable and sanitized.

## Safety and privacy

- Allergy/dietary implications reviewed.
- No unsupported safety claim is introduced.
- Data classification, retention, and redaction are addressed.
- Food-safety approval obtained where required.

## UX/accessibility

- Matches approved design direction.
- WCAG 2.2 AA checks pass.
- Real managed-iPad behavior verified where guest-facing.
- No color-only state or inaccessible touch target.

## Integration

- Adapter isolates provider contract.
- Sandbox contract tests pass.
- Retry/timeout/ambiguity behavior is verified.
- Reconciliation and rollback are defined.
- No direct client provider access.

## Engineering

- Types, lint, tests, security scans, and migrations pass.
- Observability and correlation are present.
- Feature flag and rollback exist for risky work.
- Documentation and ADRs are updated.

## Operations

- Runbook impact is documented.
- Staff-facing recovery is usable.
- Alerts route to the correct role.
- Required approvals are recorded.

