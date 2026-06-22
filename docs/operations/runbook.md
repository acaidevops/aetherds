# Operating Runbook

## 1. Operating principle

SpotOn service must continue even when AETHER is impaired. Staff may pause AETHER immediately and return to normal human service without waiting for technical support.

## 2. Roles during an incident

| Role | Responsibility |
|---|---|
| Active floor manager | Guest/staff communication, first-line containment, operational facts |
| Avinash | Technical diagnosis, provider escalation, rollback, incident record |
| Anil | Operational impact review and resume approval |
| Anusha | Food-safety review for any safety-related incident |
| SpotOn support | Confirmed RPOS/provider-side incidents |

## 3. Pause authority

- Device/table quarantine: manager
- Location ordering pause: Avinash, Anil, or active floor manager
- Global emergency pause: authorized platform operator
- Resume after critical incident: Avinash and Anil jointly
- Food-safety-related resume: Anusha also approves

Every pause/resume requires scope, reason, actor, timestamp, and audit event.

## 4. One-action fallback

Location pause must:

1. Block new AETHER order submissions.
2. Preserve existing records and unresolved states.
3. Change guest tablets to branded read-only menu mode.
4. Tell guests that human service continues.
5. Alert staff.
6. Leave SpotOn untouched and operational.

## 5. Severity

### SEV-1: immediate pause

- Safety incident or unsafe recommendation/order path
- Duplicate, missing, or cross-table SpotOn order
- Cross-tenant/cross-table data exposure
- Unauthorized privileged action
- Repeated submission failures affecting service
- Staff cannot safely serve guests through AETHER

### SEV-2: degraded but contained

- AI unavailable with deterministic fallback working
- Realtime interruption with polling working
- Delayed noncritical analytics
- Single quarantined device with spare available
- Kitchen status unavailable while order creation remains reliable

### SEV-3: minor

- Cosmetic/accessibility issue without blocked use
- Noncritical content defect
- Delayed optional notification

## 6. Incident response

1. Detect and create incident record.
2. Contain using smallest safe pause scope.
3. Confirm SpotOn/manual service is functioning.
4. Preserve correlation IDs and timestamps.
5. Communicate concise operational instructions.
6. Diagnose without exposing guest data.
7. Repair/rollback.
8. Reconcile SpotOn orders/checks before resuming.
9. Validate critical path in production-safe manner.
10. Obtain required resume approvals.
11. Document root cause, impact, and follow-up work.

## 7. Common scenarios

### SpotOn unavailable

- Pause AETHER ordering for location.
- Keep cached browsing.
- Direct guests to human server.
- Do not queue orders for future submission.
- Monitor OAuth/provider health.
- Reconcile before resume.

### POS confirmation unknown

- Block resend.
- Show staff “verification required.”
- Query/read back using immutable reference.
- Server verifies SpotOn check.
- Manager resolves only after evidence.

### AETHER unavailable

- Staff continues fully through SpotOn.
- Guest tablets stop transactional actions.
- Restore application/database.
- Reconcile accepted orders from SpotOn before resume.

### OpenAI unavailable or slow

- Automatic deterministic fallback.
- No operational pause required.
- Alert technical owner only if prolonged/cost threshold breached.

### Stale menu/availability

- Alert staff.
- Force cart validation.
- Block affected ordering paths.
- Run incremental/full reconciliation.

### Late allergy disclosure

- High-priority server and manager alert.
- Identify potentially conflicting accepted items.
- Tell guest not to consume until staff verifies.
- Do not mutate SpotOn automatically.
- Engage Anusha if incident/safety data is involved.

### Device loss/noncompliance

- Quarantine device.
- Revoke credential.
- Lock/wipe through MDM.
- Move session only through manager transfer workflow.
- Deploy pre-provisioned spare.

## 8. Backup and recovery

- Encrypted backup and point-in-time recovery
- RPO: 15 minutes
- RTO: 2 hours
- Recovery sequence:
  1. Restore database/application.
  2. Disable submissions.
  3. Reconcile SpotOn accepted orders/checks.
  4. Rebuild projections/jobs.
  5. Validate tenant isolation and critical flow.
  6. Obtain resume approval.

## 9. Operating checks

### Before service

- SpotOn auth and sync healthy
- Menu freshness within threshold
- No dead-letter/unknown submissions
- Guest devices compliant, charged, and correctly assigned
- Staff dashboard and audible alerts functioning
- Floor sections assigned
- Spare device ready

### After service

- Resolve pending requests/submissions
- Review incidents and sync drift
- Confirm sessions closed
- Check device charging/compliance
- Record pilot metrics during pilot period

## 10. Incident record fields

- Incident ID/severity
- Start/detection/containment/recovery timestamps
- Location/table/session opaque references
- Correlation IDs
- Customer/operational impact
- Safety/privacy assessment
- SpotOn/AETHER state
- Actions and actors
- Resume approvals
- Root cause
- Corrective/preventive work

## 11. Telemetry and audit

OpenTelemetry traces and metrics (ADR 0013) are initialized in
`instrumentation.ts`. They export over OTLP/HTTP when
`OTEL_EXPORTER_OTLP_ENDPOINT` is configured and to the console otherwise, so
local and CI run with no telemetry config. Every request and response carries a
correlation id (`x-correlation-id`) that ties logs, spans, metrics, and audit
events together across the session → order → outbox chain.

During diagnosis:

- Filter traces, logs, and metrics by the incident's correlation id(s).
- `audit_events` is the append-only actor/action/correlation trail
  (security-privacy.md §7). Query it by `correlation_id`, `restaurant_id`, or
  `action`. Platform operators read all rows; a tenant reads only its own scope.
- Never attempt `UPDATE` or `DELETE` on `audit_events`: a trigger rejects
  mutation for every role, including the service role. Correct the record by
  appending a superseding entry, not by editing history.

`audit_events` rows are retained for 1 year (security-privacy.md §12); the
purge is a future scheduled job (ADR 0011).

