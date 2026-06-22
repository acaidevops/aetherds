import { metrics, type Attributes } from '@opentelemetry/api';

/**
 * Metrics seam over OpenTelemetry (A4).
 *
 * As with {@link ../tracing}, the meter is resolved through the global provider
 * on each access so the real one is used once `instrumentation.ts` has started
 * the SDK; before that, recording is a safe no-op.
 *
 * The histogram is keyed only on low-cardinality labels (`http.route` + status
 * code) per ADR 0011's cardinality guidance — never raw URLs, headers, or
 * tenant ids.
 */

const METER_NAME = 'aetherds';
const REQUEST_DURATION = 'http.server.request.duration';

let histogram: HistogramHandle | undefined;

interface HistogramHandle {
  record(value: number, attrs?: Attributes): void;
}

function getHistogram(): HistogramHandle {
  if (!histogram) {
    histogram = metrics.getMeter(METER_NAME).createHistogram(REQUEST_DURATION, {
      unit: 'ms',
      description: 'HTTP server request duration in milliseconds.',
    });
  }
  return histogram;
}

/**
 * Record an HTTP request duration observation in milliseconds, labelled by the
 * stable route and response status code.
 */
export function recordRequestDuration(route: string, status: number, durationMs: number): void {
  getHistogram().record(durationMs, {
    'http.route': route,
    'http.response.status_code': status,
  });
}
