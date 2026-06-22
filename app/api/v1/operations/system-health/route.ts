import 'server-only';

import { type NextResponse } from 'next/server';

import { recordAuditEvent } from '@/modules/audit';
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
 * log — the proof of "metrics/traces for core command path". It also records a
 * best-effort `platform.accessed` audit event, exercising request → context →
 * audit service → append-only table end to end. The audit write is awaited in
 * `finally` and swallows its own failures, so a telemetry/DB hiccup can never
 * change a health response. Every response carries the x-correlation-id header
 * (api-contracts.md §1).
 */
async function getSystemHealthRoute(): Promise<NextResponse> {
  // withRequestObservability sets the request context before invoking the
  // handler, so the correlation id is always present here. If this function is
  // ever invoked without the wrapper, fail loudly rather than emit a response
  // with a missing correlation header. (The wrapper passes the request, but this
  // handler reads everything it needs from the context, so it takes no params.)
  const correlationId = getCorrelationId();
  if (!correlationId) {
    throw new Error('system-health route invoked outside the request observability context.');
  }

  let outcome: 'success' | 'failure' = 'success';
  try {
    const health = await getSystemHealth({
      appEnv: serverEnv.appEnv,
      appVersion: serverEnv.appVersion,
    });
    return apiResponse(health, { correlationId });
  } catch (error) {
    outcome = 'failure';
    if (error instanceof ApiError) {
      return apiErrorResponse(error, correlationId);
    }
    // Generic 500 handling matures with A4 (observability). Re-raise so Next's
    // error boundary produces a redacted response rather than leaking detail.
    throw error;
  } finally {
    // Best-effort audit of platform-operations access. recordAuditEvent derives
    // correlation/actor/scope from the request context; a failure here must not
    // affect the response.
    await recordAuditEvent({ action: 'platform.accessed', outcome }).catch(() => undefined);
  }
}

export const GET = withRequestObservability(getSystemHealthRoute);
