import 'server-only';

import { type NextResponse, type NextRequest } from 'next/server';

import { getSystemHealth } from '@/modules/platform-operations';
import { serverEnv } from '@/shared/config';
import { apiErrorResponse, apiResponse } from '@/shared/http';
import { CORRELATION_HEADER, resolveCorrelationId } from '@/shared/observability';
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
 * Every response carries the x-correlation-id header (api-contracts.md §1).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const correlationId = resolveCorrelationId(request.headers.get(CORRELATION_HEADER));

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
    // Generic 500 handling matures with A4 (observability). Re-raise so Next's
    // error boundary produces a redacted response rather than leaking detail.
    throw error;
  }
}
