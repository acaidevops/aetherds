# ADR 0003: Human Approval for Every Order

Status: Accepted
Date documented: 2026-06-18
Decision owners: Avinash (product), Anil (operations), Anusha (food safety)
Supersedes: None
Superseded by: None

## Context

Guest intent can contain modifier, allergy, alcohol, preparation, and service
details that require accountable restaurant judgment before kitchen routing.

## Decision drivers

- Human accountability
- Food-safety and alcohol controls
- Preservation of hospitality and server context

## Considered alternatives

- Direct guest-to-POS submission: rejected for safety and operational risk.
- Approval only for flagged orders: rejected because flag completeness cannot
  be guaranteed.

## Decision

Every AETHER order requires an authorized server to review and approve it before SpotOn submission.

## Consequences

- Human review covers modifiers, notes, allergy status, availability, and alcohol.
- Material changes require guest confirmation.
- AETHER cannot directly route guest intent to the kitchen.
- Approval ownership and response time are auditable.

## Verification

- No provider submission can be created without an authorized approval record.
- Revision tests prove a server cannot approve unseen guest intent.
