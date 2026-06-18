# Security and Privacy

## 1. Security objectives

- Prevent cross-tenant and cross-location access.
- Prevent unauthorized ordering, approval, and privileged administration.
- Protect SpotOn/OpenAI credentials and guest/staff data.
- Preserve traceability without collecting unnecessary sensitive data.
- Allow immediate containment without disrupting SpotOn.

## 2. Identity and authorization

### Guest devices

- One revocable credential per provisioned device
- Bound to restaurant, location, and default table
- Never embed a service-role key or trust a URL table ID
- Active staff-started session required for interactive actions

### Staff

- Individual accounts; no shared PIN identities
- Short-lived sessions
- Fast re-entry PIN/biometric on trusted devices after secure login
- Strong reauthentication for table reassignment, safety approval, ambiguous-order resolution, and broad pause/resume

### Tenant administration

- Managers manage local server accounts
- Owners manage managers and cross-location access
- Platform support cannot silently impersonate users

## 3. Tenant isolation

- `restaurant_id` on every tenant-owned record
- `location_id` on location-scoped records
- Scope derived from authenticated membership/device context
- Supabase RLS on all client-reachable tables
- Server-side authorization even where RLS exists
- Automated negative tests for every role and cross-tenant path

## 4. Secrets

- Server-side encrypted secret storage only
- Separate environment credentials
- Separate location SpotOn authorization
- Least-privilege access by integration services
- Redaction from logs, exceptions, client responses, and analytics
- Rotation and compromise-revocation procedures

## 5. Data minimization

Anonymous sessions are the default.

Do not retain after session closure without explicit consent:

- Names or cross-visit identity
- Allergy/dietary profiles
- Conversation transcripts
- Device-entered free text
- Diner profiles

Retain anonymized operational outcomes according to policy.

## 6. Sensitive flows

### Allergies

- Treat as sensitive session data.
- Expose only to staff who need it for service.
- Do not place details on lock-screen notifications.
- Store only structured operational evidence after closure where needed for audit, preferably de-identified.

### Alcohol

- Store only that age verification occurred for the current session.
- Do not store document images, birth dates, or identity-document numbers.

### Payment

- AETHER never collects card data or payment authorization.
- Avoid handling PCI data entirely.
- SpotOn checkout owns tips and payment state.

## 7. Logging and observability

Allowed:

- Correlation IDs
- Tenant/location/device/session opaque IDs
- State transitions
- Provider status/category
- Latency, retry count, and redacted error code

Prohibited:

- Credentials/tokens
- Payment data
- Full guest free text
- Full allergy details
- Raw AI prompts/responses by default
- Provider payloads containing unnecessary data

Audit logs are append-only and include actor, action, timestamp, scope, reason, correlation ID, and before/after references.

## 8. Device security

- Managed single-app kiosk mode
- Staff-only exit
- Remote lock/wipe
- Compliance checks and optional geofencing
- Disable printing/sharing and preferably screenshots
- No persistent sensitive local data
- Cache only published menu/media
- Clear session data on closure/revocation
- Physical table mounting and one ready spare

## 9. Network

- Dedicated AETHER VLAN/Wi-Fi
- No direct reachability to SpotOn terminals by default
- Cloud API integration only unless SpotOn officially requires otherwise
- Business-grade monitoring and cellular failover
- Connectivity loss still disables transactional writes

## 10. Abuse controls

- Rate limits by device, session, IP, user, and operation
- Duplicate suppression for orders/requests
- Active-session requirement
- Behavioral anomaly detection
- No guest CAPTCHA on managed table devices
- Quarantine affected device/action and alert staff

## 11. Privacy and ownership

- Restaurant owns identifiable tenant operational/guest data.
- AETHER is processor/service provider.
- Platform may use aggregated, de-identified metrics for reliability/product improvement.
- No restaurant data trains a general model without contractual opt-in.
- Welcome screen links a concise privacy notice.
- Nonessential tracking, identifiable research, cross-visit profiles, or diagnostics require explicit consent.

## 12. Retention

| Data | Retention |
|---|---|
| Security/privilege/menu-safety/order-change audit | 1 year |
| Anonymized analytics | 2 years |
| Authorized redacted diagnostics | ≤ 7 days |
| Session guest context | Clear at closure |
| Offboarded tenant data | Export + 30-day recovery, then delete unless legally required |

## 13. Pre-pilot validation

- Dependency and secret scanning
- Authentication/RLS/authorization tests
- Webhook replay/signature tests
- Rate/abuse tests
- Session hijacking tests
- Device kiosk review
- Cross-table and cross-tenant tests
- Focused independent penetration test
- Legal review of privacy, disclaimers, and integration obligations

