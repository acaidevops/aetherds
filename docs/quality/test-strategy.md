# Test Strategy

## 1. Quality priorities

1. Food-safety controls
2. Order correctness and duplicate prevention
3. Tenant/table/session isolation
4. Human authorization
5. Recovery and operational continuity
6. Accessibility and usability
7. Performance and cost

## 2. Test layers

### Unit

- Recommendation hard filters and ranking
- Allergen combination logic
- Money calculations/estimates
- State transition guards
- Escalation timers
- Derived guest status
- Retention and redaction

### Database/integration

- Constraints and transactions
- RLS positive and negative cases
- Outbox atomicity
- Worker locking/idempotency
- Session/table uniqueness
- Immutable batch behavior
- Audit event creation

### SpotOn contract

Run against sandbox:

- OAuth/token refresh
- Menu pagination and updates
- Modifier min/max/nesting
- Availability changes
- Order create/read-back
- Same-key retry
- Timeout and ambiguous acknowledgment
- Table/check association
- Employee attribution
- Webhook verification/replay/deduplication
- Rate limits

### API

- Auth context and role matrix
- Intent-specific transitions
- Optimistic concurrency conflicts
- Idempotency
- Rate limits
- Sanitized errors
- Cross-tenant/table denial

### End-to-end

Real managed iPad and staff devices:

- Session start/close/reset
- Guided and direct menu paths
- Diner/allergy flows
- Order approval/revision/decline
- Alcohol verification
- Multiple batches
- Check request/reopen
- Service request escalation
- Device transfer/quarantine
- Browse-only fallback

### Accessibility

- Automated checks
- Screen reader
- Text scaling
- Contrast
- Touch targets
- Reduced motion
- Keyboard operation for staff
- Manual WCAG 2.2 AA review

### Performance/resilience

- 50 active tables / 200 clients
- Peak order bursts
- Slow/unavailable OpenAI
- Slow/unavailable SpotOn
- Realtime disconnect/reconnect
- Database pool pressure
- Job retry/dead-letter
- Backup restoration and reconciliation

### Security

- Dependency and secret scans
- Session hijacking
- Device credential misuse
- Privilege escalation
- RLS bypass attempts
- Webhook replay/forgery
- API abuse/rate limits
- Prompt injection
- Focused independent penetration test

## 3. Critical scenario matrix

| Scenario | Expected result |
|---|---|
| Sold-out item in cart | Submission blocked; guest selects replacement |
| Price changes before submit | Explicit guest acceptance required |
| Allergy + unknown modifier data | Ordering blocked; server escalation |
| Server edits chargeable item | New immutable revision; guest confirmation |
| Same batch submitted twice | One effective SpotOn order |
| SpotOn accepts but response times out | `confirmation_unknown`; no resend |
| AETHER outage | SpotOn/manual service continues |
| OpenAI malformed output | Output discarded; deterministic fallback |
| Cross-table device request | Denied and alerted |
| Paid check event | Prompt close; auto-close after eligible 10 minutes |

## 4. Release evidence

Every release affecting ordering/safety/integration must provide:

- Test run links/results
- Migration plan
- Feature flag/rollback plan
- SpotOn contract evidence if applicable
- Accessibility impact
- Security/privacy impact
- Required approvals

## 5. Exit criteria

No production release with:

- Failing critical tests
- Unresolved high-severity security finding
- Unverified destructive migration
- Unknown safety regression
- Broken SpotOn duplicate/reconciliation behavior
- Missing rollback

