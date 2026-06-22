# Pilot Launch Checklist

All required boxes must be evidenced, not verbally assumed.

## SpotOn

- [ ] Partner approval received
- [ ] Sandbox and production authorization complete
- [ ] OAuth/token lifecycle tested
- [ ] Menu/modifier/availability contract tests pass
- [ ] Table/check/employee mapping validated
- [ ] Order write and read-back pass
- [ ] Duplicate, timeout, and ambiguity drills pass
- [ ] Webhook verification/deduplication pass
- [ ] Reconciliation pass

## Product and menu

- [ ] Curated menu covers required sales volume and categories
- [ ] Every published item has a valid SpotOn mapping
- [ ] Descriptions/images approved
- [ ] Ingredients/allergens/dietary claims approved by Anusha or authorized delegate
- [ ] Chef-experience templates approved
- [ ] Promotions are SpotOn-backed and labeled

## Security and privacy

- [ ] RLS and authorization matrix pass
- [ ] Cross-tenant/table/session tests pass
- [ ] Secrets and dependency scans pass
- [ ] Device credentials and revocation tested
- [ ] Webhook replay/forgery tests pass
- [ ] Focused penetration test completed
- [ ] High-severity findings resolved
- [ ] Privacy/disclaimer/legal review completed

## Reliability and operations

- [ ] 50-table/200-client load target tested
- [ ] OpenAI fallback tested
- [ ] SpotOn outage browse-only fallback tested
- [ ] AETHER outage leaves SpotOn service functional
- [ ] Unknown-confirmation procedure tested
- [ ] Backup restore and SpotOn reconciliation tested
- [ ] RPO/RTO assessed
- [ ] Device/location/global pause tested
- [ ] Alert routing and escalation tested
- [ ] Telemetry exports to the configured collector (or degrades to console when unset)
- [ ] `audit_events` migration applied and append-only trigger verified
- [ ] Audit 1-year retention purge job tracked (ADR 0011; future work)

## Devices and network

- [ ] Five guest iPads plus one spare provisioned
- [ ] Kiosk/MDM policies applied
- [ ] Devices physically secured and charged
- [ ] Cleaning/privacy/paused/quarantine states tested
- [ ] Dedicated Wi-Fi/VLAN operational
- [ ] Cellular failover tested
- [ ] Unsupported browser/device handling tested

## UX and accessibility

- [ ] Guest critical path works on managed iPad
- [ ] Staff critical path works on supported devices
- [ ] WCAG 2.2 AA review complete
- [ ] Screen reader, text scaling, touch targets, contrast, and reduced motion pass
- [ ] Guest status never invents kitchen timing
- [ ] Human assistance remains accessible from every screen

## Staff and pilot

- [ ] Sections and server mappings configured
- [ ] Staff training completed
- [ ] Competency checklist completed
- [ ] Mock service completed
- [ ] Incident/fallback drill completed
- [ ] Pilot/control tables and shifts selected
- [ ] Metric collection validated
- [ ] Floor-manager support coverage scheduled

## Final approvals

- [ ] Avinash — technical go
- [ ] Anil — operational go
- [ ] Anusha — food-safety go
- [ ] No unresolved launch-blocking risk
- [ ] Rollback and communication plan reviewed

