# ADR 0011: Supabase Worker Runtime and Recovery Scheduling

Status: Accepted
Date: 2026-06-18
Decision owners: Avinash (technical), Anil (operational)
Supersedes: None
Superseded by: None

## Context

AETHER requires durable, low-latency processing for SpotOn submissions, webhook
processing, reconciliation, menu synchronization, session auto-close, request
escalation, and retention jobs. Vercel request handlers are not the owner of
this work: completing a guest or staff HTTP request must not depend on an
unbounded background task continuing after the response.

The database transaction that approves an order must remain atomic with the
record that causes provider submission. Worker delivery can be at-least-once,
but provider effects must remain idempotent and ambiguous responses must never
be retried as new orders.

## Decision drivers

- Atomic domain transition and durable work registration
- Low order-dispatch latency during service
- Recovery after missed wake-ups, deployment, or transient runtime failure
- Per-location ordering and provider-rate control
- Minimal MVP infrastructure beyond the existing Supabase/Vercel stack
- Observable ownership for retries, dead letters, and ambiguous outcomes

## Considered alternatives

### Vercel request or `after` work only

Rejected as the durable execution owner. It couples critical work to the
request runtime and does not provide the queue ownership, claim, retry, and
dead-letter semantics required by order submission.

### Vercel Cron as the only scheduler

Rejected for the critical dispatch path. Periodic polling alone adds avoidable
latency and plan-dependent scheduling constraints. It may be used for
noncritical maintenance but is not the POS worker trigger.

### External queue or workflow platform

Deferred. It adds another operational dependency before measured load or
workflow complexity requires it.

### PostgreSQL outbox with Supabase worker runtime

Accepted. It preserves transactionality and keeps the MVP operational surface
inside the selected database platform.

## Decision

1. PostgreSQL `outbox_jobs` is the durable source of pending work. The domain
   transition and outbox insertion occur in one transaction.
2. Supabase Edge Functions are the initial worker runtime. Workers call only
   application-service entry points and provider adapters; business rules do
   not live in function handlers.
3. After commit, an asynchronous database wake-up may invoke the relevant Edge
   Function to reduce latency. The wake-up is an optimization, not a delivery
   guarantee.
4. Supabase Cron invokes a recovery sweeper every 10 seconds for critical
   queues and on task-specific schedules for reconciliation and maintenance.
   The sweeper claims any eligible work missed by wake-ups.
5. Claims use a database transaction with `FOR UPDATE SKIP LOCKED`, a
   `locked_at` lease, `locked_by`, attempt count, and lease expiry. A crashed
   worker's job becomes claimable after the lease expires.
6. Each invocation claims at most 10 jobs and runs for at most 60 seconds.
   Provider calls use a 20-second request timeout. A worker stops claiming new
   work when less than 10 seconds of its execution budget remains.
7. SpotOn submission concurrency is one active job per location. Different
   locations may process concurrently. Nontransactional queues may use bounded
   concurrency configured per job type.
8. A maximum of eight scheduled worker invocations may run concurrently per
   environment. Raising this requires load-test evidence and a recorded
   architecture review.
9. Retryable failures use exponential backoff with full jitter and the same
   immutable provider idempotency/reference key. Default delays are 5, 15, 45,
   and 120 seconds, capped at five automatic attempts unless the job type
   specifies a stricter policy.
10. Timeout or any result where provider acceptance is unknown transitions the
    submission to `confirmation_unknown`. It is removed from normal retry and
    routed to reconciliation.
11. Exhausted definitive transient failures enter `dead_letter`. They do not
    disappear or restart automatically.
12. Scheduled maintenance jobs are idempotent and use stable schedule-window
    keys so overlapping scheduler invocations cannot duplicate effects.

## Failure ownership

| Failure class | Primary owner | Required response |
|---|---|---|
| Retryable worker/runtime failure | Platform operator | Automatic same-key retry; alert on threshold |
| Dead-letter SpotOn submission | Active floor manager + platform operator | Preserve order state, use human service, diagnose and resolve |
| `confirmation_unknown` | Manager | Reconcile/read back; manager records final resolution |
| Repeated scheduler/wake-up failure | Platform operator | Pause AETHER ordering if dispatch SLO is breached |
| SpotOn outage | Active floor manager | Switch AETHER to browse-only; normal SpotOn/manual service continues |
| Safety-related job failure | Food-safety owner + platform operator | Block affected publication or ordering path |

## Observability and service levels

- Record queue age, claim latency, execution latency, attempt count, outcome,
  lease recovery, and dead-letter count by job type and location.
- Alert when a critical queued job is unclaimed for 15 seconds, when the
  oldest critical job exceeds 30 seconds, or when any POS submission enters
  `confirmation_unknown` or `dead_letter`.
- Correlate dining session, approval group, outbox job, worker invocation,
  provider attempt, and reconciliation result.
- Redact provider payloads and sensitive session data from logs.

## Consequences

- Critical background work has one durable owner and an explicit recovery path.
- A missed asynchronous wake-up does not lose work.
- The MVP avoids a separate broker while retaining an extraction boundary.
- Edge Function limits and database polling must be load-tested before pilot.
- A later dedicated worker service may replace the runtime without changing
  domain commands or outbox semantics.

## Verification

- Transaction rollback proves no job exists without its domain transition.
- Killing a worker after claim proves lease recovery.
- Duplicate invocation proves one effective provider operation.
- Timeout-after-provider-acceptance proves reconciliation without resend.
- Scheduler and wake-up outages prove recovery within the critical queue SLO.

## References

- [Supabase Queues](https://supabase.com/docs/guides/queues)
- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

