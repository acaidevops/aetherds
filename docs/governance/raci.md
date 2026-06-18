# Roles, Responsibilities, and Approvals

## 1. Named owners

| Area | Primary | Backup/secondary |
|---|---|---|
| Product/restaurant operations | Avinash | Anil |
| Technical ownership | Avinash | Designated engineering backup before pilot |
| Operational release approval | Anil | Named delegate required before absence |
| Food safety | Anusha | Explicitly designated trained approver |
| Live first-line support | Active floor manager | Anil |
| SpotOn-side incident | Avinash coordinates | SpotOn support |

## 2. Decision matrix

| Decision/action | Required authority |
|---|---|
| Routine code merge | Engineering review |
| Production release | Avinash + Anil |
| Food-safety behavior/data release | Anusha additionally |
| Immediate location pause | Avinash, Anil, or active floor manager |
| Resume after critical incident | Avinash + Anil |
| Resume after safety incident | Avinash + Anil + Anusha |
| Device/table reassignment | Manager with reauthentication |
| Ambiguous POS resolution | Manager |
| Allergen/dietary publication | Independent authorized food-safety approver |
| Tenant support session | Owner/manager approval; audited |
| Destructive migration | Avinash + rollback/off-hours plan |
| Pilot go/no-go | Avinash + Anil + Anusha |

## 3. Menu approvals

- Managers may draft all enrichment.
- Managers approve ordinary descriptions/images/pairings.
- Anusha or delegated trained approver independently approves ingredients, allergens, dietary claims, recipes, and supplier changes.
- Authors cannot approve their own safety changes.
- Any manager may immediately remove/restrict a claim or unpublish an item.

## 4. Documentation governance

- Product changes update the PRD and backlog.
- Domain language/authority changes update `CONTEXT.md`.
- Consequential technical changes create/supersede an ADR.
- Runbook changes require operational review.
- Safety procedure changes require Anusha.
- SpotOn assumptions move to “verified” only with contract-test evidence.

## 5. Pre-pilot staffing gaps

Before launch, explicitly name:

- Engineering backup for Avinash
- Anil’s operational delegate
- At least one trained food-safety delegate if required
- On-call/escalation contact details
- SpotOn partner/support contacts

