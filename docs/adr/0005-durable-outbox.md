# ADR 0005: PostgreSQL Outbox and Idempotent Jobs

Status: Accepted
Date documented: 2026-06-18
Decision owners: Avinash (technical), Anil (operations)
Supersedes: None
Superseded by: None

## Context

Order approval and the intent to call SpotOn must not diverge when a request,
deployment, or provider call fails.

## Decision drivers

- Atomic registration of provider work
- At-least-once processing with one effective provider operation
- Recoverable ambiguous results
- Complete attempt history

## Considered alternatives

- Call SpotOn inside the approval transaction: rejected because external I/O
  cannot participate safely in the database transaction.
- In-memory jobs: rejected because process failure loses work.
- Separate broker for MVP: deferred until operational evidence requires it.

## Decision

Use a PostgreSQL-backed transactional outbox, idempotent workers, attempt history, and dead-letter handling for SpotOn synchronization.

## Consequences

- Approval and intent-to-submit commit atomically.
- Retries reuse an immutable provider reference.
- Ambiguous results reconcile instead of blindly retrying.
- Redis/message-broker infrastructure is deferred.

## Verification

- Rollback, duplicate-delivery, worker-crash, and ambiguous-timeout tests pass.
- Runtime details follow [ADR 0011](0011-worker-runtime-and-scheduling.md).
