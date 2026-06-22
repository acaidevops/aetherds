/**
 * OpenTelemetry initialization hook (A4).
 *
 * Next.js calls `register()` once per Node server runtime, after env is loaded
 * and before requests are handled. We start the OTel {@link NodeSDK} here so
 * every route, worker, and scheduled job emits traces + metrics through one
 * provider (ADR 0013).
 *
 * Build/edge safety:
 * - The hook returns early during `next build`'s static analysis
 *   (`phase-production-build`). `serverEnv` validates `process.env` at module
 *   load and route modules are imported during the build's "Collecting page
 *   data" step, so any side-effectful SDK init here would re-trigger that
 *   validation. We must not run during the build.
 * - `NodeSDK` is Node-only; skip the Edge runtime (`NEXT_RUNTIME !== 'nodejs'`).
 * - All config is read and all SDK packages are imported INSIDE `register`, so
 *   merely importing this module at build time is side-effect-free. OTel reads
 *   `process.env` directly (never `serverEnv`), adding no required env var.
 *
 * Exporter selection: when `OTEL_EXPORTER_OTLP_ENDPOINT` is set, traces and
 * metrics go to OTLP/HTTP (the exporters read the endpoint themselves). With no
 * endpoint (CI, local) both fall back to the console exporter, so the app runs
 * with zero telemetry config.
 */

const PHASE_PRODUCTION_BUILD = 'phase-production-build';

export async function register(): Promise<void> {
  // Skip the production build: route import during "Collecting page data" must
  // not trigger SDK init or any transitive env validation.
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) return;
  // NodeSDK patches Node built-ins; it cannot run on the Edge runtime.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const useOtlp = Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

  const [
    { NodeSDK },
    { resourceFromAttributes },
    { OTLPTraceExporter },
    { OTLPMetricExporter },
    sdkTraceBase,
    sdkMetrics,
  ] = await Promise.all([
    import('@opentelemetry/sdk-node'),
    import('@opentelemetry/resources'),
    import('@opentelemetry/exporter-trace-otlp-http'),
    import('@opentelemetry/exporter-metrics-otlp-http'),
    import('@opentelemetry/sdk-trace-base'),
    import('@opentelemetry/sdk-metrics'),
  ]);

  // `Resource` is a type-only export in @opentelemetry/resources v2; build one
  // from attributes. service.name/version/env identify spans + metrics.
  const resource = resourceFromAttributes({
    'service.name': process.env.OTEL_SERVICE_NAME ?? 'aetherds',
    'service.version': process.env.APP_VERSION ?? '0.0.0',
    'deployment.environment': process.env.APP_ENV ?? 'development',
  });

  const traceExporter = useOtlp ? new OTLPTraceExporter() : new sdkTraceBase.ConsoleSpanExporter();
  const metricReader = new sdkMetrics.PeriodicExportingMetricReader({
    exporter: useOtlp ? new OTLPMetricExporter() : new sdkMetrics.ConsoleMetricExporter(),
  });

  const sdk = new NodeSDK({ resource, traceExporter, metricReader });

  try {
    sdk.start();
  } catch (err) {
    // Telemetry must never break a request or a deploy.
    console.error('[otel] failed to start OpenTelemetry SDK', err);
  }
}
