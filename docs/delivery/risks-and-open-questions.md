# Risks and Open Questions

## 1. Active risks

| Risk | Impact | Mitigation | Owner |
|---|---|---|---|
| SpotOn partner access delayed beyond July 1 | Ordering pilot moves | Apply immediately; build mock adapter; run only clearly labeled concierge study if needed | Avinash |
| SpotOn cannot append batches to one check as expected | Core order flow redesign | Validate first in sandbox; isolate behavior in adapter | Avinash |
| Provider idempotency/read-back is weaker than required | Duplicate or ambiguous orders | Use AETHER reference, read-back reconciliation, manager resolution; do not launch until safe | Avinash |
| Menu/allergen enrichment incomplete | Unsafe or low-value experience | Launch curated subset; block unknown allergy paths; independent approval | Anusha |
| July timeline compresses security/accessibility work | Unsafe launch pressure | Feature freeze July 1; launch gates cannot be waived | Avinash / Anil |
| Shared tablet becomes cumbersome for large parties | Poor guest satisfaction | Limit diner profiles to 12; keep human service optional | Anil |
| PWA push/kiosk limitations | Missed staff alerts | Always-open dashboard baseline; test Web Push; native wrapper only if proven necessary | Avinash |
| Staff does not consistently acknowledge/complete work | Service degradation | Training, explicit ownership, escalation, pilot monitoring | Anil |
| Restaurant Wi-Fi instability | Transaction interruption | Isolated business Wi-Fi, cellular failover, browse-only fallback | Anil |
| AI cost/latency exceeds pilot budget | Slow/costly UX | Two-second fallback, caching, quotas, 50/75/90% budget alerts | Avinash |
| Dual role concentration on Avinash | Operational/technical bottleneck | Name engineering backup before pilot | Avinash |

## 2. Open SpotOn contract questions

These are not product decisions; they require official documentation/sandbox evidence:

- Exact OAuth scopes and token lifecycle
- Certification timeline and production onboarding
- RPOS table and open-check lookup semantics
- Whether one integration may append multiple batches to the same check
- Stable provider idempotency/reference support
- Order read-back/filtering by external reference
- Employee attribution requirements
- Course/group metadata support
- Modifier nesting and allergen-relevant structure
- Availability webhook guarantees
- Webhook signing/replay details
- Payment/check closure status availability
- Kitchen/preparation status availability
- Rate limits and retry guidance

## 3. Team decisions required before implementation completion

- Name technical backup for Avinash.
- Name Anil’s operational delegate.
- Confirm location address/timezone/currency configuration.
- Select standardized iPad model, stand/case, MDM, and cellular-failover equipment.
- Confirm current AnTeNa menu export and sales-volume data.
- Confirm exact staff roles and initial users.
- Set concrete escalation timers per request type.
- Define platform monitoring/alert vendors.
- Select penetration-test provider and legal counsel.
- Record production support contacts for SpotOn.

## 4. Decision rule

If an unresolved provider or safety question affects order correctness, duplicate prevention, allergy handling, authorization, or recovery, it blocks production ordering. It does not get resolved by assumption.

