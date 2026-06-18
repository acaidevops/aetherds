# ADR 0002: SpotOn Owns Transactional Truth

Status: Accepted
Date documented: 2026-06-18
Decision owners: Avinash (technical), Anil (operations)
Supersedes: None
Superseded by: None

## Context

Both systems hold related order and menu state. A single authority is required
for every field to prevent conflicting prices, availability, kitchen status,
and payment state.

## Decision drivers

- Eliminate split-brain transactional state
- Preserve kitchen and payment correctness
- Make reconciliation deterministic

## Considered alternatives

- AETHER as transactional authority: rejected because SpotOn executes the
  restaurant workflow.
- Bidirectional last-write-wins synchronization: rejected because it cannot
  preserve financial or kitchen correctness.

## Decision

SpotOn RPOS is authoritative for transactional menu facts, acknowledged orders/checks, kitchen routing, coursing, and payment.

## Consequences

- AETHER owns pre-acknowledgment workflow only.
- Provider mismatch reconciles toward SpotOn.
- No standalone AETHER KDS in MVP.
- Post-acceptance changes occur through staff in SpotOn.

## Verification

- Contract tests reconcile acknowledged orders toward SpotOn.
- Guest status never exceeds the provider evidence available.
