import { SpanStatusCode, trace } from '@opentelemetry/api';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { withSpan } from '@/shared/observability';

/**
 * withSpan resolves its tracer through the global provider, so we register a
 * real provider with an in-memory exporter (no network) and inspect finished
 * spans. The provider is set once per file (OTel's global is set-once; vitest
 * isolates each file in its own module registry).
 */
const exporter = new InMemorySpanExporter();

beforeAll(() => {
  const provider = new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });
  trace.setGlobalTracerProvider(provider);
});

beforeEach(() => {
  exporter.reset();
});

describe('withSpan', () => {
  it('records a span with the given name and returns the result', async () => {
    const result = await withSpan('test.work', async (span) => {
      span.setAttribute('aether.test', 'yes');
      return 42;
    });

    expect(result).toBe(42);
    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans.at(0)?.name).toBe('test.work');
  });

  it('records the exception with ERROR status and re-throws on failure', async () => {
    await expect(
      withSpan('test.fail', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    const span = exporter.getFinishedSpans().at(0);
    expect(span).toBeDefined();
    if (!span) return; // narrows for the property accesses below
    expect(span.status.code).toBe(SpanStatusCode.ERROR);
    expect(span.events.some((e) => e.name === 'exception')).toBe(true);
  });
});
