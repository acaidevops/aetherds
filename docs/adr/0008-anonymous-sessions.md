# ADR 0008: Anonymous Table-Bound Sessions

Status: Accepted
Date documented: 2026-06-18
Decision owners: Avinash (product), Anil (operations)
Supersedes: None
Superseded by: None

## Context

The table experience does not require durable guest identity, while allergy,
preference, and free-text data create privacy risk if retained across visits.

## Decision drivers

- Data minimization
- Low-friction table use
- Clear device, table, and guest identity separation

## Considered alternatives

- Mandatory guest accounts: rejected as unnecessary friction and data scope.
- Persistent device profile: rejected because a shared restaurant tablet is
  not a guest identity.

## Decision

MVP guests do not create accounts. Staff starts a table-bound session; optional diner profiles exist only within it.

## Consequences

- No loyalty or cross-visit personalization in MVP.
- Session-specific preferences, allergies, favorites, and transcripts are cleared on closure.
- Device identity is separate from guest identity.
- Returning-guest wording is excluded.

## Verification

- Session closure clears temporary guest context.
- Cross-session tests prove a device cannot recover prior diner data.
