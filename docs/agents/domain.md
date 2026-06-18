# Domain documentation

This repository uses a single domain context.

## Required reading

Before changing behavior or creating implementation issues:

1. Read `CONTEXT.md` for ubiquitous language and authority boundaries.
2. Read the relevant requirements in `docs/product/MVP-PRD.md`.
3. Read applicable decisions under `docs/adr/`.
4. Consult `docs/architecture/`, `docs/security/`, `docs/quality/`, and
   `docs/operations/` for the affected workflow.

## Vocabulary

Use the exact domain terms defined in `CONTEXT.md` in issue titles, tests,
types, and implementation discussions. Do not silently introduce synonyms for
Dining Session, Order Batch, Approval Group, POS Submission, SpotOn Check
Link, Menu Enrichment, or Service Request.

## Decision conflicts

If proposed work contradicts an accepted ADR, identify the conflict and create
or propose a superseding ADR before implementation. Do not silently override a
recorded authority, safety, tenancy, integration, or reliability boundary.

## Traceability

Implementation issues reference stable PRD requirement IDs and applicable ADR
numbers. Update the traceability matrix in `docs/delivery/backlog.md` whenever
scope changes.

