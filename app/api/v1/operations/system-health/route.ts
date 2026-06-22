import 'server-only';

import { type NextResponse } from 'next/server';

import { getSystemHealth } from '@/modules/platform-operations';
import { serverEnv } from '@/shared/config';
import { apiErrorResponse, apiResponse } from '@/shared/http';
import { getCorrelationId, withRequestObservability } from '@/shared/observability';
import { ApiError } from '@/shared/validation';

/**
 * GET /api/v1/operations/system-health
 *
 * A1 sample route: proves the route → application service → domain path
 * end-to-end through the platform-operations public surface (ADR 0004: "Routes
 * call module application services rather than mutating tables directly"). It
 * returns a baseline health projection derived from validated server config;
 * the repository/infrastructure ping is wired in A3.
 *
 * Platform operations owns tenant provisioning, health, feature flags, and
 * support access (system-architecture.md §3). Authoritative platform routes and
 * auth arrive in later epics; this read-only projection is the A1 seam.
 *
 * A4 observability: the handler runs inside {@link withRequestObservability},
 * which establishes the correlation {@link RequestContext}, wraps the call in a
 * trace span, records a request-duration histogram, and emits one structured
 * log — the proof of "metrics/traces for core command path". This is a liveness
 * probe, so it deliberately does NOT write an audit event: a health check must
 * stay fast and independent of database latency, and auditing every poll would
 * flood the immutable trail. The audit service is exercised by its own tests and
 * by the real audited commands (order approval, membership changes) in their
 * epics. Every response carries the x-correlation-id header (api-contracts.md §1).
 */
async function getSystemHealthRoute(): Promise<NextResponse> {
  // withRequestObservability sets the request context before invoking the
  // handler, so the correlation id is always present here. If this function is
  // ever invoked without the wrapper, fail loudly rather than emit a response
  // with a missing correlation header.
  const correlationId = getCorrelationId();
  if (!correlationId) {
    throw new Error('system-health route invoked outside the request observability context.');
  }

  try {
    const health = await getSystemHealth({
      appEnv: serverEnv.appEnv,
      appVersion: serverEnv.appVersion,
    });
    return apiResponse(health, { correlationId });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErrorResponse(error, correlationId);
    }
    // Re-raise so the observability wrapper logs a sanitized error and Next's
    // error boundary produces a redacted response rather than leaking detail.
    throw error;
  }
}

export const GET = withRequestObservability(getSystemHealthRoute);
