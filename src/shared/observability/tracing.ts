import { context, trace, SpanStatusCode, type Attributes, type Span } from '@opentelemetry/api';

/**
 * Tracing seam over OpenTelemetry (A4).
 *
 * Application code calls {@link withSpan} instead of touching the OTel API
 * directly. Before the SDK is registered (build, or a misconfigured runtime)
 * `trace.getTracer` returns a no-op tracer, so callers are always safe. The
 * tracer is resolved through the global provider on each call so the real one
 * is picked up once `instrumentation.ts` has started the SDK.
 *
 * Manual span wrapping (rather than @opentelemetry/auto-instrumentations) is
 * deliberate: it is Turbopack-safe and keeps the instrumented surface to the
 * command paths A4 owns. See ADR 0013.
 */

const TRACER_NAME = 'aetherds';

/**
 * Run `fn` inside an active span. Exceptions are recorded on the span (with
 * ERROR status) and re-thrown so route error handling is unchanged; the span is
 * always ended.
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attrs?: Attributes,
): Promise<T> {
  return trace.getTracer(TRACER_NAME).startActiveSpan(name, async (span) => {
    if (attrs) span.setAttributes(attrs);
    try {
      return await fn(span);
    } catch (err) {
      span.recordException(err instanceof Error ? err : String(err));
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      span.end();
    }
  });
}

/** Attach attributes to the currently-active span, if any (no-op otherwise). */
export function addSpanAttributes(attrs: Attributes): void {
  const span = trace.getSpan(context.active());
  span?.setAttributes(attrs);
}
