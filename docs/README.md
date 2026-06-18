# Documentation Map

This directory is the canonical source for product, architecture, delivery, and operating decisions.

## Product

- [Product Design Context](../PRODUCT.md)
- [MVP Product Requirements](product/MVP-PRD.md)

## Architecture

- [System Architecture](architecture/system-architecture.md)
- [Domain Model](architecture/domain-model.md)
- [State Machines](architecture/state-machines.md)
- [API Contracts](architecture/api-contracts.md)
- [OpenAPI 3.1 Contract](architecture/openapi.yaml)

## Integrations and AI

- [SpotOn RPOS Integration](integrations/spoton.md)
- [AI Concierge Design](ai/ai-concierge.md)

## Experience, security, and quality

- [Guest and Staff Experience Specification](ux/experience-spec.md)
- [Security and Privacy](security/security-privacy.md)
- [Test Strategy](quality/test-strategy.md)
- [Engineering Guide](engineering/development.md)

## Operations and governance

- [Operating Runbook](operations/runbook.md)
- [Pilot Plan](operations/pilot-plan.md)
- [Roles and Approvals](governance/raci.md)

## Delivery

- [Roadmap](delivery/roadmap.md)
- [Implementation Backlog](delivery/backlog.md)
- [Definition of Done](delivery/definition-of-done.md)
- [Risks and Open Questions](delivery/risks-and-open-questions.md)
- [Pilot Launch Checklist](delivery/launch-checklist.md)

## Architecture decisions

See [ADR index](adr/README.md).

## Document rules

- Update `CONTEXT.md` when domain language or core authority boundaries change.
- Create or supersede an ADR for consequential architecture decisions.
- Keep SpotOn assumptions labeled until verified in sandbox.
- Link implementation issues to acceptance criteria and relevant ADRs.
- Never keep a competing canonical specification outside the repository.
- Keep `PRODUCT.md` strategic and non-duplicative of `CONTEXT.md` and the PRD.
- Create `DESIGN.md` from implemented, accessibility-tested tokens and
  components during E1; do not treat provisional mood language as a token
  source.
