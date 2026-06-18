# Delivery Roadmap

Target dates are planning constraints, not commitments that override safety or SpotOn dependency gates.

## Milestone 0: SpotOn access and project foundation

Target: immediate through July 1, 2026

- Submit/complete SpotOn partner onboarding
- Confirm certification and sandbox process
- Scaffold application and isolated environments
- Establish CI/CD, migrations, observability, secrets, and feature flags
- Build mock SpotOn adapter and contract-test harness
- Establish design system and managed-device plan

Exit: foundational workflow can run against mock provider; API access status known.

## Milestone 1: menu and administration

- SpotOn menu normalization/mapping
- Enrichment workflow and safety approvals
- Publication/version/rollback
- Device provisioning/table mapping
- Staff accounts, roles, memberships, RLS
- Location/request configuration

Exit: curated menu can be reviewed and published safely.

## Milestone 2: guest experience

- Session lifecycle
- Guided discovery and direct browsing
- Temporary diner profiles
- Allergy/preference flows
- Recommendations and deterministic fallback
- Cart, compare, favorites, and final review
- Service requests

Exit: complete guest flow against mock integration on managed iPad.

## Milestone 3: server and order workflow

- Live assigned-table dashboard
- Immutable batches/revisions/approval groups
- Decline/partial approval/guest confirmation
- Alcohol verification
- Escalation/push baseline
- Check request and ordering pause/reopen

Exit: staff can safely review every order scenario.

## Milestone 4: verified SpotOn integration

- OAuth and location authorization
- Menu/webhook/polling reconciliation
- Table/check/employee mapping
- Idempotent order write/read-back
- Unknown-confirmation recovery
- Limited check/status mirroring where reliable

Exit: sandbox critical path and failure matrix pass.

## Milestone 5: operational readiness

- Kiosk/MDM deployment
- Pause/quarantine/fallback
- Backup/recovery rehearsal
- Security testing and penetration test
- Accessibility audit
- Load/resilience tests
- Staff training and mock service
- Legal review

Exit: launch gates and approvals satisfied.

## Milestone 6: non-peak pilot

- 3–5 opt-in tables
- Daily incident/metric review
- Three successful services before peak consideration
- Four-week controlled evaluation

Exit: evidence-based expand/change/stop decision.

## Scope freeze

After July 1, 2026, only:

- Launch-blocking fixes
- Safety corrections
- Verified SpotOn contract changes
- Essential operational improvements

All other work moves after pilot.

