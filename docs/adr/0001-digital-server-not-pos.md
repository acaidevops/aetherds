# ADR 0001: Digital Server, Not POS

Status: Accepted
Date documented: 2026-06-18
Decision owners: Avinash (product/technical), Anil (operations)
Supersedes: None
Superseded by: None

## Context

AETHER is introduced into an operating restaurant that already depends on
SpotOn for transaction, kitchen, and payment workflows. Replacing those
functions would expand scope, certification burden, and operational risk.

## Decision drivers

- Preserve restaurant continuity
- Improve hospitality without duplicating financial systems
- Keep MVP scope compatible with a controlled pilot

## Considered alternatives

- Full POS replacement: rejected because it is outside the product purpose and
  would create unacceptable operational and compliance scope.
- Self-service ordering terminal: rejected because it removes the accountable
  human approval central to the experience.

## Decision

AETHER is a hospitality and guest-experience layer. It does not replace the restaurant POS.

## Consequences

- UX emphasizes guidance, education, and service rather than checkout.
- Payments, taxes, tips, comps, and financial closure remain outside AETHER.
- Human service remains available.
- Success is primarily guest satisfaction, not transaction throughput.

## Verification

- No AETHER surface collects payment or represents itself as the POS.
- Outage drills prove normal SpotOn service continues without AETHER.
