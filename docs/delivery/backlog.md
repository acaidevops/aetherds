# MVP Implementation Backlog

This backlog is ordered by dependency and organized as vertical outcomes. Create GitHub Issues from these items and link each issue to its acceptance criteria, relevant ADRs, and milestone.

Stable requirement IDs come from the
[MVP PRD](../product/MVP-PRD.md). The traceability matrix at the end of this
document is part of every backlog item's definition; generated issues must copy
its requirement and ADR references.

Priority:

- P0: launch/safety critical
- P1: required MVP value
- P2: useful if schedule permits; may defer

## Epic A: Foundation and delivery

### A1 — Scaffold application and module boundaries (P0)

Deliver Next.js/TypeScript application with guest, staff, admin, API, and domain-module structure.

Acceptance:

- Strict TypeScript, lint, formatting, unit-test baseline
- Environment validation
- Thin sample route through an application service
- No environment secret exposed to client bundle

### A2 — Isolated environments and deployment (P0)

Acceptance:

- Separate development, staging, production Supabase/Vercel configuration
- Separate secrets, domains, storage, and webhooks
- Feature flags and global/location pause primitives
- Production deployment approval gate

### A3 — Database migration and RLS baseline (P0)

Acceptance:

- Migration tooling and staging validation
- Tenant/location columns and indexes
- RLS deny-by-default
- Automated cross-tenant negative test

### A4 — Observability and audit foundation (P0)

Acceptance:

- Correlation IDs across API/jobs
- Structured redacted logging
- Metrics/traces for core command path
- Append-only audit event service

## Epic B: Identity, tenancy, and devices

### B1 — Staff authentication and membership authorization (P0)

Acceptance:

- Individual accounts
- Owner/manager/server/platform roles
- Location membership enforcement
- Strong reauthentication hook for privileged commands

### B2 — Device provisioning and revocation (P0)

Acceptance:

- One-time manager setup flow
- Revocable device credential
- Location/default-table binding
- Reassignment invalidates prior capability
- Quarantine and audit

### B3 — Tables and server sections (P1)

Acceptance:

- Immutable table ID; display number unique per location
- Separate SpotOn mapping placeholder
- Manager creates sections and assigns/reassigns tables
- Pending work routes to new server

## Epic C: Dining sessions

### C1 — Session start/close and tablet reset (P0)

Acceptance:

- Staff-only start/close
- One active session per table/device
- Pre-session read-only mode
- Closure clears guest context
- Closure blockers and manager override

### C2 — Privacy, cleaning, pause, and auto-close states (P1)

Acceptance:

- Inactivity privacy screen
- Staff cleaning mode
- Browse-only paused mode
- Paid-check prompt and eligible 10-minute auto-close
- Active request postpones auto-close

### C3 — Session transfer (P1)

Acceptance:

- Manager-only transfer
- Destination inactive check
- Old device access revoked immediately
- Pending requests and assignment migrate
- SpotOn mapping reconciliation hook

### C4 — Temporary diner profiles (P1)

Acceptance:

- Up to 12 optional profiles
- Preferences/allergens per diner
- Shared-item participants
- No cross-session persistence

## Epic D: SpotOn menu and enrichment

### D1 — SpotOn adapter interface and mock (P0)

Acceptance:

- Provider-neutral AETHER interface
- Mock menu, availability, check, order, and failure scenarios
- Contract-test suite reusable against sandbox
- No production assumptions hidden in domain code

### D2 — SpotOn OAuth/location authorization (P0, blocked by access)

Acceptance:

- Official OAuth flow
- Encrypted location-scoped tokens
- Refresh/revocation behavior
- Health alerts

### D3 — Menu import and normalization (P0) ✅

**Status**: Complete (Issue #24)

Acceptance:

- ✅ Categories/items/modifiers/prices/availability normalized
- ✅ Raw provider snapshot protected (immutable snapshots table)
- ✅ Stable mapping records (menu_mappings table)
- ✅ New items unpublished (default is_published=false)
- ✅ Broken mappings flagged, never guessed (per ADR-0006)

**Implementation**: Database schema (3 tables + RLS), domain models, repositories, importMenu() service. 32 tests passing (13 unit, 11 contract, 8 integration).

### D4 — Webhook, polling, and reconciliation (P0)

Acceptance:

- Signature/replay verification
- Persist-before-process
- Event deduplication
- Incremental operating-hours polling
- Nightly full reconciliation
- Freshness alert and sync cursor

### D5 — Enrichment authoring and publication (P0)

Acceptance:

- Draft/review/approved/published workflow
- Versioned descriptions/images/ingredients/allergens/tags/pairings
- Manager ordinary-content approval
- Independent food-safety approval
- Atomic publish and rollback

### D6 — Curated pilot menu readiness (P0)

Acceptance:

- ≥80% common dine-in sales volume represented
- Core categories and dietary journeys covered
- Valid SpotOn mapping, price, availability, modifiers
- Representative image or branded placeholder
- Safety status reviewed

## Epic E: Guest discovery and AI

### E1 — Guest design system and shell (P1)

Acceptance:

- Dark, modern, minimal, warm visual system
- Persistent menu/cart/server assistance
- Standardized tablet responsive behavior
- Reduced-motion and accessibility tokens
- Root `DESIGN.md` generated from the implemented tokens and components
- Component states documented for default, hover, focus, active, disabled,
  loading, error, empty, and skeleton behavior

### E2 — Guided discovery and preferences (P1)

Acceptance:

- Configurable dining intents
- Optional budget
- Protein/spice/dietary preferences
- Explicit allergy question every session
- Preference versus allergy branching

### E3 — Deterministic recommendation engine (P0)

Acceptance:

- Safety/availability hard filters
- Priority ranking from approved rules
- Complete meal and individual suggestions
- Chef-approved templates
- Promotion labeling
- Deterministic fallback always available

### E4 — Bounded AI explanation and Q&A (P1)

Acceptance:

- Structured-output schema
- Candidate-ID allowlist validation
- Two-second fallback
- Unknown facts escalate
- Prompt-injection tests
- Versioned evaluation suite

### E5 — Menu browse/detail/compare/favorites (P1)

Acceptance:

- Image-led categories
- Verified detail fields
- Compare up to three
- Session-only favorites
- Unavailable items removed promptly

## Epic F: Cart and safety

### F1 — Cart and SpotOn modifier validation (P0)

Acceptance:

- Required/min/max/nested modifiers
- Diner/shared assignment
- Money in minor units
- Menu version tracking
- No free-text replacement for modifiers

### F2 — Allergy safety engine (P0)

Acceptance:

- `contains`, `may_contain`, `cross_contact_possible`, `unknown`
- Item-plus-modifier evaluation
- Shared item combined constraints
- Unknown/cross-contact block
- No AETHER override
- Late disclosure alert path

### F3 — Checkout revalidation and review (P0)

Acceptance:

- Validate on checkout and submission
- Identify price/availability/modifier changes
- Explicit guest acceptance
- Final review shows allergy status and subtotal limitations

## Epic G: Order approval and SpotOn submission

### G1 — Immutable order batches and revisions (P0)

Acceptance:

- Snapshot all required operational fields
- Immutable submitted version
- Material changes create new version
- Server cannot approve unseen revision
- Optimistic concurrency tests

### G2 — Server review workflow (P0)

Acceptance:

- Accept ownership explicitly
- Approve/decline/partial/revise
- Required decline reasons
- Guest confirmation timeout
- Server-reviewed notes only

### G3 — Alcohol approval groups (P1)

Acceptance:

- Authorized staff only
- Session-level age verification without ID data
- Food/alcohol independent state
- Course intent preserved

### G4 — Durable SpotOn submission worker (P0)

Acceptance:

- Approval + outbox committed atomically
- Immutable idempotency key
- Same-key retry
- Attempt history
- Dead-letter handling

### G5 — Unknown confirmation reconciliation (P0)

Acceptance:

- Timeout enters `confirmation_unknown`
- Automatic resend blocked
- Read-back/reconciliation by reference
- Server verification and manager resolution
- Duplicate failure drill passes

### G6 — Table/check/employee mapping (P0)

Acceptance:

- Manager-approved table mapping
- Ambiguous open checks require staff selection
- Check created only when required
- Approving-server attribution where supported
- Missing employee mapping blocks approval

### G7 — Guest order/check status projection (P1)

Acceptance:

- Separate AETHER/POS/SpotOn states
- Only verified kitchen status shown
- Limited SpotOn-backed check summary if reliable
- Staff-added versus AETHER-origin item distinction
- “Question this item” request

## Epic H: Service and staff operations

### H1 — Service request lifecycle (P0)

Acceptance:

- Configurable request types
- Explicit accept/start/complete
- Duplicate merge
- Cancel/no-longer-needed
- Persistent guest status

### H2 — Routing and escalation (P0)

Acceptance:

- Assigned-server first
- Configurable timers
- Floor queue escalation
- Urgent server+manager alert
- Disconnected staff-device handling

### H3 — Server live dashboard (P0)

Acceptance:

- Assigned tables and prioritized work
- Allergy/alcohol/revision/escalation visibility
- Concise context, no unrestricted transcript
- Always-open audible alert baseline

### H4 — Manager live floor and insights separation (P1)

Acceptance:

- Live operations view
- Integration/device health
- Pause/quarantine controls
- Historical insights view
- No public rankings

### H5 — Check request and ordering pause (P1)

Acceptance:

- High-priority request
- Pause new submissions
- Undo before acceptance
- Server reopen action
- No payment mutation

## Epic I: Feedback and analytics

### I1 — Feedback and recovery alert (P1)

Acceptance:

- One dismissible end-of-meal prompt
- Rating/tags/optional comment
- 1–2 stars or safety tag alerts manager
- Comment access controls and redaction

### I2 — Privacy-safe analytics events (P1)

Acceptance:

- Recommendation impressions/acceptance/rejection
- Service/order timing
- Guest satisfaction
- Minimum cohort thresholds
- No sensitive demographic inference

### I3 — Pilot reporting (P1)

Acceptance:

- AETHER versus comparison-table metrics
- Daily/weekly summaries
- Reliability and safety report
- Export for final pilot decision

## Epic J: Operations, security, and launch

### J1 — Pause, fallback, and device quarantine (P0)

Acceptance:

- Device/location/global scope
- Branded browse-only mode
- Reason and audit
- SpotOn unaffected
- Resume approval enforcement

### J2 — MDM/kiosk deployment (P0)

Acceptance:

- Single-app mode
- Staff-only exit
- Lock/wipe and compliance
- Printing/sharing disabled
- Cleaning mode
- Spare-device procedure

### J3 — Backup/recovery and reconciliation drill (P0)

Acceptance:

- Point-in-time restore tested
- 15-minute RPO/2-hour RTO assessed
- SpotOn reconciliation before resume
- Evidence recorded

### J4 — Security and penetration testing (P0)

Acceptance:

- Automated scanning
- RLS/auth/webhook/rate-limit tests
- Independent focused penetration test
- High-severity findings resolved

### J5 — Accessibility and real-device validation (P0)

Acceptance:

- WCAG 2.2 AA review
- Screen reader/text scale/touch target/reduced motion
- Guest/staff critical paths on managed devices

### J6 — Staff training and mock service (P0)

Acceptance:

- Role-based session
- Competency checklist
- Allergy, revision, ambiguity, outage drills
- Named attendees and results

### J7 — Legal and go/no-go review (P0)

Acceptance:

- Privacy/disclaimer/integration legal review
- Launch metrics and incidents reviewed
- Avinash, Anil, Anusha approvals recorded

## Explicit post-MVP backlog

- Voice concierge
- Consent-based returning guest profiles and loyalty
- Reservation integration
- Takeout/delivery
- Split-check experience
- Android guest-tablet certification
- Multi-location operational workflows
- Kitchen-load recommendations from reliable data
- Native wrappers if PWA limitations are proven

## MVP traceability matrix

| Item | Requirements | ADRs |
|---|---|---|
| A1 | REL-01, REL-05 | 0004, 0010, 0011 |
| A2 | REL-01, REL-07, REL-08, GATE-05 | 0004, 0009, 0011 |
| A3 | REL-01, GATE-06 | 0010 |
| A4 | GATE-02, GATE-05, GATE-08 | 0005, 0011 |
| B1 | USR-SERVER-01..06, USR-MANAGER-01..07 | 0010 |
| B2 | SES-01, USR-MANAGER-02, USR-MANAGER-06 | 0008, 0010 |
| B3 | USR-MANAGER-01, SRV-03 | 0010 |
| C1 | SES-01..03, PILOT-05 | 0008, 0009 |
| C2 | SES-07, FBK-01, REL-06 | 0008, 0009 |
| C3 | SES-05 | 0008, 0010 |
| C4 | SES-04, USR-GUEST-03 | 0008 |
| D1 | MENU-01, DEP-01..03 | 0002, 0006 |
| D2 | MENU-01, DEP-01 | 0002, 0010 |
| D3 | MENU-01..03, MENU-05 | 0002, 0006 |
| D4 | MENU-05, REL-01 | 0002, 0005, 0011 |
| D5 | MENU-02, MENU-03, USR-SAFETY-01..02 | 0006, 0010 |
| D6 | MENU-04, GATE-01 | 0006 |
| E1 | UX-01..07, UX-04 | 0001 |
| E2 | USR-GUEST-02..03, SAFE-01..03, UX-05 | 0008 |
| E3 | USR-GUEST-04, SAFE-05..07, REL-04 | 0007 |
| E4 | USR-GUEST-04, SAFE-04, REL-04 | 0007 |
| E5 | USR-GUEST-01, USR-GUEST-05, UX-02..03 | 0006, 0008 |
| F1 | USR-GUEST-06, MENU-06, ORD-07..08 | 0002, 0006 |
| F2 | SAFE-01..07, GATE-01 | 0003, 0006, 0007 |
| F3 | MENU-06, ORD-03, SAFE-03 | 0003, 0006 |
| G1 | ORD-02, ORD-03 | 0003, 0005 |
| G2 | ORD-01, ORD-03, USR-SERVER-02..04 | 0003 |
| G3 | ORD-04 | 0003 |
| G4 | ORD-01, GATE-02, REL-01 | 0005, 0011 |
| G5 | GATE-02, GATE-05, GATE-08 | 0002, 0005, 0011 |
| G6 | USR-SERVER-05, USR-MANAGER-07 | 0002, 0003 |
| G7 | USR-GUEST-09, ORD-05 | 0002 |
| H1 | SRV-01, SRV-04..05 | 0008, 0010 |
| H2 | SRV-02..03, SRV-06, REL-03 | 0010, 0011 |
| H3 | USR-SERVER-01..03, GATE-03 | 0003, 0010 |
| H4 | USR-MANAGER-04, USR-MANAGER-06 | 0010 |
| H5 | USR-GUEST-10, USR-SERVER-06, ORD-05 | 0001, 0002 |
| I1 | FBK-01..03 | 0008, 0010 |
| I2 | GATE-04, PILOT-03 | 0008, 0010 |
| I3 | GATE-02..04, PILOT-03 | 0002, 0010 |
| J1 | USR-MANAGER-06, USR-PLATFORM-03, PILOT-05 | 0001, 0009, 0011 |
| J2 | SES-01, GATE-07 | 0008, 0010 |
| J3 | REL-07..08, GATE-05, GATE-08 | 0002, 0005, 0011 |
| J4 | GATE-06, GATE-09 | 0010 |
| J5 | UX-04, GATE-07 | 0001 |
| J6 | GATE-03, GATE-05, GATE-08 | 0003, 0009, 0011 |
| J7 | GATE-01..10, DEP-01..03 | 0001..0011 |

Ranges such as `SES-01..03` mean every inclusive requirement ID in that range.
An implementation issue is incomplete if it changes scope without updating
this matrix and the corresponding PRD requirement.
