# ADR 0004: Modular Monolith for MVP

Status: Accepted
Date documented: 2026-06-18
Decision owners: Avinash (technical)
Supersedes: None
Superseded by: None

## Context

The MVP has many domain boundaries but a small operating team and one initial
location. Deployment independence is less valuable than clear ownership and
low operational complexity.

## Decision drivers

- Fast delivery by a small team
- Explicit domain boundaries
- Simple deployment and incident response
- Future extraction without premature distribution

## Considered alternatives

- Microservices: rejected until measured scaling or isolation needs exist.
- Unstructured Next.js application: rejected because domain boundaries would
  collapse into route and database coupling.

## Decision

Build the MVP as a Next.js modular monolith with explicit domain modules.

## Consequences

- Lower deployment and operational complexity.
- Domain boundaries remain enforced in code and data ownership.
- Durable jobs may scale independently without premature microservices.
- Extraction requires measured need.

## Verification

- Architecture tests prevent imports of another module's infrastructure.
- Routes call module application services rather than mutating tables directly.
