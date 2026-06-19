import { NextRequest } from 'next/server';

import { describe, expect, it } from 'vitest';

import { GET } from '@/app/api/v1/operations/system-health/route';
import { CORRELATION_HEADER, isValidCorrelationId } from '@/shared/observability';

const URL = 'http://localhost/api/v1/operations/system-health';
const VALID_CORR = 'corr_00000000-0000-4000-8000-000000000000';

describe('GET /api/v1/operations/system-health', () => {
  it('returns 200 with the health projection and echoes the correlation id', async () => {
    const req = new NextRequest(URL, {
      headers: { [CORRELATION_HEADER]: VALID_CORR },
    });

    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get(CORRELATION_HEADER)).toBe(VALID_CORR);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.appEnv).toBe('development');
    expect(body.checks.app).toBeDefined();
    expect(Number.isNaN(new Date(body.checkedAt as string).getTime())).toBe(false);
  });

  it('mints a correlation id when the client provides none', async () => {
    const res = await GET(new NextRequest(URL));

    const corr = res.headers.get(CORRELATION_HEADER);
    expect(corr).not.toBeNull();
    expect(isValidCorrelationId(corr as string)).toBe(true);
  });

  it('mints a fresh correlation id when the provided one is malformed', async () => {
    const req = new NextRequest(URL, {
      headers: { [CORRELATION_HEADER]: 'not-a-corr-id' },
    });

    const res = await GET(req);

    const corr = res.headers.get(CORRELATION_HEADER);
    expect(corr).not.toBe('not-a-corr-id');
    expect(isValidCorrelationId(corr as string)).toBe(true);
  });
});
