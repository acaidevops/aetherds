import 'server-only';

import { type NextRequest, type NextResponse } from 'next/server';

import { CORRELATION_HEADER, resolveCorrelationId } from './correlation';
import { withRequestContext, type RequestContext } from './context';
import { logger } from './logger';
import { recordRequestDuration } from './metrics';
import { withSpan } from './tracing';

/**
 * Server-side request observability wrapper (A4).
 *
 * Thin higher-order wrapper for App-Router route handlers that establishes the
 * correlation {@link RequestContext}, wraps the call in a trace span, records a
 * request-duration histogram observation, and emits one structured log per
 * request — the concrete proof of "metrics/traces for core command path" on the
 * system-health route. The handler's response (with its correlation header,
 * attached by `apiResponse`/`apiErrorResponse`) is returned unchanged; on throw
 * the error is logged with the correlation id and re-thrown so route error
 * handling and Next's error boundary still shape the response.
 *
 * This lives in `shared/` and stays free of any module import: dependency-cruiser
 * forbids `src/shared` → `src/modules`. Audit recording therefore belongs in the
 * route (which may import module barrels), not here.
 */

type RouteHandler = (request: NextRequest) => Promise<NextResponse>;

export function withRequestObservability(handler: RouteHandler): RouteHandler {
  return async (request) => {
    const correlationId = resolveCorrelationId(request.headers.get(CORRELATION_HEADER));
    const route = `${request.method} ${new URL(request.url).pathname}`;
    const ctx: RequestContext = {
      correlationId,
      // Tenant scope is resolved from auth in later epics; the platform-operations
      // health route acts as a service principal until then.
      actor: { type: 'service', id: 'platform-operations' },
      route,
      method: request.method,
    };

    return withRequestContext(ctx, () =>
      withSpan(route, async () => {
        const startedAt = Date.now();
        let status = 500;
        try {
          const response = await handler(request);
          status = response.status;
          return response;
        } catch (err) {
          status = 500;
          logger.error('request failed', {
            route,
            error: err instanceof Error ? err.message : String(err),
          });
          throw err;
        } finally {
          const durationMs = Date.now() - startedAt;
          recordRequestDuration(route, status, durationMs);
          logger.info('request completed', { route, status, durationMs });
        }
      }),
    );
  };
}
