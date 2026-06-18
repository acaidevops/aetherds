# AnTeNa MVP Pilot Plan

## 1. Objective

Determine whether AETHER improves the seated guest experience without reducing safety, order reliability, staff effectiveness, or normal SpotOn operations.

## 2. Target

- Conditional target: July 31, 2026
- SpotOn access cutoff: July 1, 2026
- Feature freeze: July 1, 2026
- Duration: at least four weeks
- Scope: one location, 3–5 opt-in tables
- Initial shifts: selected non-peak periods

## 3. Dependency gate

Production ordering requires:

- Approved SpotOn partnership/access
- Sandbox credentials
- Verified menu/order/reconciliation contracts
- Production authorization/certification

If unavailable by July 1:

- Move the ordering pilot.
- Optionally run a separately named concierge usability study.
- Limit study to menu discovery, recommendations, and service requests.
- Clearly state that digital ordering is unavailable.

## 4. Readiness phases

### Phase 0: foundations

- Canonical docs approved
- Environments and security baseline established
- Mock SpotOn adapter available
- Design system and app shells available

### Phase 1: sandbox end-to-end

Demonstrate:

```text
session start → guest cart → immutable batch → server review
→ guest revision if needed → SpotOn submission → acknowledgment
→ mirrored status → check request → session close
```

Also demonstrate allergy review, unavailable item, stale price, duplicate prevention, timeout ambiguity, and browse-only fallback.

### Phase 2: staff preparation

- 60-minute role-based training
- Supervised mock service
- Competency checklist
- Failure drill

Anyone approving orders must demonstrate:

- Allergy workflow
- Decline/revision workflow
- Ambiguous POS submission handling
- Outage fallback

### Phase 3: non-peak pilot

- 3–5 opt-in tables
- Floor manager present
- Immediate normal-service fallback
- Daily review
- At least three successful services before peak consideration

### Phase 4: controlled expansion

Requires Avinash and Anil approval plus all launch thresholds. Safety readiness remains subject to Anusha.

## 5. Experiment design

Compare AETHER tables with similar standard-service tables across comparable:

- Daypart
- Day of week
- Party size
- Server experience where practical
- Menu availability conditions

Avoid demographic profiling.

## 6. Metrics

### Primary

- Post-meal guest satisfaction
- Recommendation helpfulness

### Reliability/safety

- Correct nonduplicated SpotOn submission rate
- Unknown/failed submission count
- Order corrections
- Safety incidents and near misses
- Cart invalidations handled successfully

### Operations

- Time to staff acknowledgment
- Time to request completion
- Ordering completion time
- Staff workload/usability
- Fallback events and recovery time

### Commercial guardrails

- Average check
- Recommendation acceptance
- Featured-item acceptance

Commercial improvement does not justify lower satisfaction or safety.

## 7. Expansion thresholds

- Zero unresolved safety incidents
- ≥99.5% correct, nonduplicated SpotOn submissions
- ≥95% of orders acknowledged within 60 seconds
- No measurable decline in guest satisfaction
- Successful outage recovery without disruption to SpotOn service

## 8. Immediate rollback triggers

- Any safety incident
- Duplicate/missing/cross-table SpotOn order
- Cross-tenant/cross-table exposure
- Repeated submission failures
- Staff inability to maintain normal guest service

## 9. Approvals

Go/no-go requires:

- Avinash: technical readiness
- Anil: operational readiness
- Anusha: food-safety readiness

Each may block within their domain.

## 10. Pilot deliverables

- Daily operational summary
- Incident log
- Weekly metric review
- Guest/staff qualitative findings
- SpotOn integration reliability report
- Accessibility findings
- Final continue/change/stop recommendation

