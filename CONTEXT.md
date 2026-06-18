# AETHER Domain Context

## Product definition

AETHER Digital Server is a hospitality-focused, AI-assisted table experience. It reduces waiting and repetitive server interactions while improving menu education, recommendation quality, service access, and guest satisfaction.

It is deliberately not a self-service POS. The intended relationship is:

```text
Guest → AETHER → Human server approval → SpotOn → Kitchen/payment
```

## Product principles

1. Hospitality before transaction speed.
2. Human authority before automation.
3. Safety before personalization, popularity, promotion, or margin.
4. SpotOn owns transactional truth; AETHER owns hospitality context.
5. Structured, approved facts before generative language.
6. Graceful degradation before hidden retries or invented status.
7. Anonymous-by-default guest sessions.
8. Restaurant operations must continue if AETHER is unavailable.

## Ubiquitous language

| Term | Meaning |
|---|---|
| Restaurant | Tenant organization using AETHER |
| Location | Physical restaurant location with independent configuration and SpotOn integration |
| Table | Physical table with an immutable AETHER ID and separate display number/SpotOn mapping |
| Device | Provisioned, revocable guest tablet identity bound to a location and default table |
| Dining session | Staff-started, table-bound visit that contains guest activity |
| Diner profile | Optional temporary person-level preferences/allergies within a session |
| Menu enrichment | AETHER-owned descriptions, images, ingredients, allergens, pairings, and recommendation metadata |
| Order batch | Immutable guest-submitted set of intended items requiring server review |
| Batch revision | New immutable version created after a material server or guest change |
| Approval group | Independently approvable subset, such as food versus alcohol |
| POS submission | Durable attempt to create an order/check operation in SpotOn |
| Service request | Non-POS hospitality request such as water, server, manager, or check |
| SpotOn check link | Verified association between a dining session and SpotOn table/check |
| Food-safety owner | Authorized approver of ingredient, allergen, dietary, recipe, and supplier data |

## Authority matrix

| Concern | Authority |
|---|---|
| Item IDs, prices, modifiers, taxes, availability | SpotOn |
| Accepted order/check status | SpotOn |
| Kitchen routing and course firing | SpotOn |
| Payments, tips, comps, discounts, service charges | SpotOn |
| Guest descriptions, images, ingredients, allergens, pairings | AETHER with human approval |
| Recommendation ranking and explanations | AETHER within approved constraints |
| Service requests and staff escalation | AETHER |
| Pre-acknowledgment order workflow | AETHER |
| Post-acknowledgment order mutation | Human staff through SpotOn |

## Named responsibilities

- Primary operational owner: Avinash
- Backup operational owner and operational release approver: Anil
- Technical owner: Avinash
- Food-safety owner and food-safety go/no-go approver: Anusha
- First-line live support: active floor manager

## MVP exclusions

- AETHER payment collection
- Inventory, payroll, reservations, loyalty, delivery, and takeout
- Split-check management
- Standalone AETHER kitchen display
- Dedicated kitchen interface
- Voice interaction
- Cross-visit guest identity
- Offline transactional writes
- Android guest-tablet support
- Third-party advertising
- Autonomous AI agents

## Success definition

Primary: guest satisfaction does not decline and preferably improves.

Supporting measures:

- Recommendation helpfulness and acceptance
- Server response time
- Order accuracy
- Ordering completion time
- Average check
- Staff workload and usability
- SpotOn submission reliability
- Safety and recovery performance

