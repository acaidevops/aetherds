# ADR 0009: No Offline Transactional Writes

Status: Accepted
Date documented: 2026-06-18
Decision owners: Avinash (technical), Anil (operations)
Supersedes: None
Superseded by: None

## Context

Offline transactional intent can become stale, duplicate, or detached from
current server ownership, menu availability, and SpotOn state.

## Decision drivers

- Prevent duplicate or stale orders
- Preserve current price and availability validation
- Make degraded behavior obvious to staff and guests

## Considered alternatives

- Queue offline orders for later: rejected because delayed replay can create
  unsafe or duplicate restaurant work.
- Local-first conflict resolution: rejected because transactional authority
  cannot be reconstructed safely on reconnect.

## Decision

Menu browsing may use a last-known cache, but orders, approvals, service requests, and SpotOn mutations require confirmed connectivity.

## Consequences

- No hidden later-submission queue.
- Reduced duplicate, stale-price, and ownership risk.
- Outages switch to read-only/human service.
- Network failover improves availability but does not weaken this rule.

## Verification

- Connectivity-loss tests prove all writes are blocked and browsing is labeled.
- Reconnect does not replay transactional commands automatically.
