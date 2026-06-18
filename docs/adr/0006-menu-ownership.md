# ADR 0006: Split Transactional Menu and Hospitality Enrichment

Status: Accepted
Date documented: 2026-06-18
Decision owners: Avinash (product/technical), Anusha (food safety)
Supersedes: None
Superseded by: None

## Context

SpotOn contains transactional menu facts but not all hospitality, ingredient,
allergen, image, and recommendation content required by AETHER.

## Decision drivers

- Prevent price and availability divergence
- Permit richer approved hospitality content
- Preserve provenance and independent safety review

## Considered alternatives

- Copy and edit the full menu in AETHER: rejected because transactional facts
  would drift.
- Store enrichment in SpotOn only: rejected because required fields and
  approval workflows are not guaranteed.

## Decision

SpotOn owns item IDs, prices, modifiers, taxes, and availability. AETHER owns versioned, human-approved descriptions, images, ingredients, allergens, pairings, and recommendation metadata.

## Consequences

- AETHER cannot create transactional items.
- New SpotOn items remain unpublished until enriched.
- Broken mappings unpublish affected paths.
- Safety metadata has independent approval and provenance.

## Verification

- Published enrichment always references a valid current SpotOn mapping.
- Transactional values cannot be authored through enrichment commands.
