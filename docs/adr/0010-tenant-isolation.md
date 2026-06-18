# ADR 0010: Database-Enforced Tenant Isolation

Status: Accepted
Date documented: 2026-06-18
Decision owners: Avinash (technical)
Supersedes: None
Superseded by: None

## Context

AETHER stores operational and sensitive data for multiple restaurants and
locations. Application checks alone are insufficient protection against query
or implementation mistakes.

## Decision drivers

- Defense in depth
- Database-enforced tenant boundaries
- Auditable support access
- Multi-location readiness without cross-location leakage

## Considered alternatives

- Application-only authorization: rejected because one missed predicate can
  expose another tenant.
- Database per restaurant: deferred because it increases MVP operations while
  RLS can enforce the required boundary.

## Decision

Every tenant-owned record carries restaurant scope and, where relevant, location scope. Supabase RLS and server authorization derive scope from authenticated identity, never client-provided IDs.

## Consequences

- Cross-tenant tests are mandatory.
- Provider credentials and sync state are location-scoped.
- Support access is explicit and audited.
- Multi-location data modeling exists from the start while MVP workflows remain single-location.

## Verification

- Automated positive and negative RLS tests cover every role and tenant table.
- Client-provided tenant IDs never expand authenticated scope.
