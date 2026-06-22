import { metrics, type MeterProvider } from '@opentelemetry/api';
import { beforeAll, describe, expect, it } from 'vitest';

import { recordRequestDuration } from '@/shared/observability';

/**
 * recordRequestDuration resolves its meter through the global provider. We
 * register a fake provider whose histogram captures `record` calls, so the test
 * asserts our wrapper (instrument name + attributes + value) without coupling to
 * OTel exporter internals.
 */
interface Captured {
  readonly value: number;
  readonly attrs: Record<string, string | number>;
}
const captured: Captured[] = [];

beforeAll(() => {
  const fakeHistogram = {
    record(value: number, attrs?: Record<string, string | number>): void {
      captured.push({ value, attrs: attrs ?? {} });
    },
  };
  const fakeMeter = { createHistogram: () => fakeHistogram };
  metrics.setGlobalMeterProvider({ getMeter: () => fakeMeter } as unknown as MeterProvider);
});

describe('recordRequestDuration', () => {
  it('records the duration with low-cardinality route and status attributes', () => {
    recordRequestDuration('GET /api/v1/operations/system-health', 200, 12);

    expect(captured).toHaveLength(1);
    const record = captured.at(0);
    expect(record?.value).toBe(12);
    expect(record?.attrs['http.route']).toBe('GET /api/v1/operations/system-health');
    expect(record?.attrs['http.response.status_code']).toBe(200);
  });
});
