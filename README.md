# AETHER Digital Server

AETHER is an AI-assisted digital hospitality server for seated restaurant dining. It helps guests discover dishes, receive bounded recommendations, build orders, request service, and understand meal progress while preserving human server authority.

AETHER is not a POS. SpotOn Restaurant (RPOS) remains the transactional, kitchen-routing, payment, tax, discount, and check system of record.

## MVP target

- First customer: AnTeNa Kitchen & Bar
- Target pilot: July 31, 2026, conditional on SpotOn API access and launch gates
- Deployment: one location, 3–5 fixed guest iPads, one ready spare
- Guest experience: managed iPad PWA
- Staff experience: role-based responsive web application
- Core stack: Next.js 16, React 19, TypeScript, Supabase/PostgreSQL, Vercel, OpenAI API
- POS integration: SpotOn Centralized API for RPOS

## Start here

1. [Product and domain context](CONTEXT.md)
2. [Product design context](PRODUCT.md)
3. [MVP product requirements](docs/product/MVP-PRD.md)
4. [System architecture](docs/architecture/system-architecture.md)
5. [Domain model](docs/architecture/domain-model.md)
6. [State machines](docs/architecture/state-machines.md)
7. [API contracts](docs/architecture/api-contracts.md)
8. [SpotOn integration](docs/integrations/spoton.md)
9. [Implementation backlog](docs/delivery/backlog.md)

The complete documentation map is in [docs/README.md](docs/README.md).

## Non-negotiable boundaries

- A human server approves every order before it reaches SpotOn.
- SpotOn acknowledgment is required before an order progresses.
- SpotOn is authoritative after acknowledgment.
- AI cannot mutate orders, call SpotOn directly, invent menu facts, or make safety claims.
- AETHER failure must not prevent normal restaurant operation through SpotOn.
- Payments and final financial calculations remain entirely in SpotOn.
- AETHER remains optional; human service is always available.

## Documentation status

This repository currently establishes the implementation baseline. Provider-specific endpoint names, payloads, webhook signatures, employee attribution, check linking, and kitchen-status capabilities are provisional until SpotOn partner approval and sandbox contract testing are complete.

`PRODUCT.md` is the strategic product-design context. `DESIGN.md` is
intentionally deferred until the guest design-system work establishes tested
tokens and components; it must document the implemented system rather than
invent a competing visual specification.
