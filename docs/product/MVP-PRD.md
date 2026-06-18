# MVP Product Requirements

Status: Approved baseline  
Pilot target: July 31, 2026, conditional  
Feature freeze: July 1, 2026  
First deployment: AnTeNa Kitchen & Bar

## 1. Problem

Restaurant guests wait for menu explanations, recommendations, routine service, and order capture. Servers repeatedly answer similar questions and recommendation quality varies by experience. Conventional self-service ordering improves throughput but can reduce hospitality and place unsafe authority in software.

## 2. Product outcome

AETHER provides immediate menu guidance and service access while retaining a human server as the accountable approver. It should feel like a knowledgeable digital server, not a checkout terminal.

## 3. Users

### Guest

- `USR-GUEST-01` Browse a visual menu.
- `USR-GUEST-02` Choose optional dining intent, budget, preferences, and allergies.
- `USR-GUEST-03` Use temporary diner profiles for a shared table.
- `USR-GUEST-04` Receive approved recommendations and explanations.
- `USR-GUEST-05` Compare and favorite items within the session.
- `USR-GUEST-06` Build, review, and submit an order batch.
- `USR-GUEST-07` Confirm material server revisions.
- `USR-GUEST-08` Request service or urgent assistance.
- `USR-GUEST-09` View reliable, guest-friendly status.
- `USR-GUEST-10` Request the check and provide feedback.

### Server

- `USR-SERVER-01` View assigned tables and concise session context.
- `USR-SERVER-02` Accept ownership of orders and service requests.
- `USR-SERVER-03` Review item snapshots, modifiers, notes, allergies, and alcohol status.
- `USR-SERVER-04` Approve, decline, partially approve, or propose revisions.
- `USR-SERVER-05` Submit approved batches to SpotOn through AETHER.
- `USR-SERVER-06` Escalate questions and reopen ordering.

### Manager

- `USR-MANAGER-01` Start/close sessions and manage table/server assignments.
- `USR-MANAGER-02` Provision/reassign devices.
- `USR-MANAGER-03` Configure request types, routing, and escalation windows.
- `USR-MANAGER-04` Review live operations and historical insights separately.
- `USR-MANAGER-05` Draft and approve non-safety menu enrichment.
- `USR-MANAGER-06` Pause AETHER by device or location.
- `USR-MANAGER-07` Resolve ambiguous POS submissions.

### Food-safety approver

- `USR-SAFETY-01` Independently approve ingredients, allergens, dietary claims, recipes, and supplier changes.
- `USR-SAFETY-02` Delegate review only to designated, trained, audited approvers.

### Platform operator

- `USR-PLATFORM-01` Provision tenants and integration configuration.
- `USR-PLATFORM-02` Monitor integration/device health.
- `USR-PLATFORM-03` Manage global flags and emergency pause.
- `USR-PLATFORM-04` Use explicit, time-limited support access.

## 4. Core guest journey

1. Staff seats guests and starts the table session.
2. Guest chooses `Guide my experience`, `Browse menu`, or `Call my server`.
3. AETHER asks optional intent/preferences and an explicit allergy question.
4. Deterministic rules select valid candidates; AI may explain them.
5. Guest builds a shared cart, optionally assigning diners/seats.
6. Final review shows items, modifiers, allergies, and estimated subtotal.
7. Guest deliberately submits an immutable order batch.
8. Assigned server accepts and reviews it.
9. Material changes create a revision requiring guest confirmation.
10. AETHER validates the final batch and submits it idempotently to SpotOn.
11. SpotOn acknowledgment establishes transactional authority.
12. SpotOn routes to kitchen and controls coursing/payment.
13. AETHER shows only verified progress and remains available for service.
14. Check request pauses ordering; SpotOn handles payment.
15. Guest receives one dismissible feedback prompt near closure.
16. Staff closes the session; tablet data is cleared.

## 5. Functional requirements

### Sessions and devices

- `SES-01` Fixed, provisioned iPad per table; manager-changeable and audit-logged.
- `SES-02` Staff starts and closes sessions.
- `SES-03` Read-only menu before activation.
- `SES-04` Up to 12 optional temporary diner profiles.
- `SES-05` Session transfer between tables is manager-only.
- `SES-06` Combining sessions is not supported.
- `SES-07` Inactivity shows a privacy screen but does not end the session.

### Menu

- `MENU-01` SpotOn supplies transactional menu facts.
- `MENU-02` New SpotOn items enter unpublished staging.
- `MENU-03` AETHER publishes only reviewed enrichment.
- `MENU-04` Curated launch subset may be used, covering at least 80% of common dine-in sales volume.
- `MENU-05` Availability updates target five-second propagation.
- `MENU-06` Cart revalidation occurs at checkout and submission.

### Ordering

- `ORD-01` Every order requires server approval.
- `ORD-02` Submitted batches are immutable.
- `ORD-03` Price/item/quantity/allergen/preparation changes require guest confirmation.
- `ORD-04` Food and alcohol may use separate approval groups.
- `ORD-05` Accepted orders cannot be directly changed by guests.
- `ORD-06` Reorder copies into a new cart and repeats validation/approval.
- `ORD-07` No automatic substitution.
- `ORD-08` Unsupported customizations become server clarification requests.

### Safety

- `SAFE-01` Allergies and preferences are separate.
- `SAFE-02` Allergy status is `none`, `declared`, `ask_server`, or `not_provided`.
- `SAFE-03` Declared/uncertain allergies require verbal server confirmation.
- `SAFE-04` AETHER never claims an item is safe.
- `SAFE-05` `contains`, `may_contain`, `cross_contact_possible`, and `unknown` are distinct.
- `SAFE-06` Cross-contact and unknown risks are excluded from allergy-sensitive ordering.
- `SAFE-07` AETHER allergy blocks cannot be overridden.

### Service requests

- `SRV-01` Persistent server assistance from every screen.
- `SRV-02` Configurable types and timers per location.
- `SRV-03` Assigned-server routing with floor escalation.
- `SRV-04` Explicit accept and complete actions.
- `SRV-05` Repeated active requests merge rather than duplicate.
- `SRV-06` Urgent assistance alerts server and manager immediately.

### Feedback

- `FBK-01` One optional prompt after check request or ready-to-close state.
- `FBK-02` Rating plus structured tags; optional protected free text.
- `FBK-03` Ratings 1–2 or safety tags alert a manager discreetly.

## 6. Experience requirements

- `UX-01` Modern, futuristic, minimal, dark, high-contrast, and warm.
- `UX-02` Image-led and editorial rather than transactional.
- `UX-03` Prices clear but secondary to dish understanding.
- `UX-04` WCAG 2.2 AA.
- `UX-05` Guided discovery optional and resumable.
- `UX-06` Human assistance always one tap away.
- `UX-07` No voice, ads, realistic avatar, or default audio.

## 7. Reliability and performance

- `REL-01` Internal target: 99.9% during operating hours, measured per subsystem.
- `REL-02` Menu/navigation from cache: under 300 ms target.
- `REL-03` Service request confirmation: under 1 second target.
- `REL-04` Recommendation response: under 2 seconds; otherwise deterministic fallback.
- `REL-05` Capacity: 50 active tables and 200 concurrent clients per location.
- `REL-06` No offline writes.
- `REL-07` RPO: 15 minutes.
- `REL-08` RTO: 2 hours.

## 8. Launch gates

- `GATE-01` No unresolved safety incidents.
- `GATE-02` At least 99.5% correct, non-duplicated SpotOn submissions.
- `GATE-03` At least 95% of orders acknowledged by staff within 60 seconds.
- `GATE-04` No measurable guest-satisfaction decline.
- `GATE-05` Staff can recover from outages without disrupting SpotOn service.
- `GATE-06` Automated safety/integration tests pass.
- `GATE-07` Managed-device end-to-end tests pass.
- `GATE-08` Failure drills pass.
- `GATE-09` Focused independent penetration test passes.
- `GATE-10` Avinash, Anil, and Anusha each approve readiness in their domain.

## 9. External dependency

SpotOn partner approval and sandbox credentials are required by July 1, 2026. If delayed:

- `DEP-01` Production ordering pilot moves.
- `DEP-02` No browser automation, unofficial API, or duplicate-entry workaround is permitted.
- `DEP-03` A separately named concierge usability study may test guidance and service requests without claiming digital order submission.

## 10. Pilot

- `PILOT-01` 3–5 opt-in tables.
- `PILOT-02` Selected non-peak shifts.
- `PILOT-03` Four-week controlled comparison with similar standard-service tables.
- `PILOT-04` Three successful non-peak services before peak expansion.
- `PILOT-05` Immediate fallback to normal human/SpotOn service.
