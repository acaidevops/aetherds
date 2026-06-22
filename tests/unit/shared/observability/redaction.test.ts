import { describe, expect, it } from 'vitest';

import { redact, sanitizeError } from '@/shared/observability';

describe('sanitizeError', () => {
  it('returns a stable type and code, never the raw message', () => {
    class DbError extends Error {
      code = '23505';
      constructor() {
        super('duplicate key value violates unique constraint "secret_payload_here"');
        this.name = 'DbError';
      }
    }
    const out = sanitizeError(new DbError());
    expect(out).toEqual({ errorType: 'DbError', errorCode: '23505' });
    expect(JSON.stringify(out)).not.toMatch(/secret_payload_here/);
  });

  it('omits the code when absent and handles non-Error throwables', () => {
    expect(sanitizeError(new Error('boom'))).toEqual({ errorType: 'Error' });
    expect(sanitizeError('a string')).toEqual({ errorType: 'string' });
  });
});

describe('redact', () => {
  it('redacts every §7 prohibited key category', () => {
    const out = redact({
      password: 'p',
      token: 't',
      apiKey: 'k',
      api_key: 'k2',
      authorization: 'a',
      credential: 'c',
      payment: { card: '4111' },
      cvv: '123',
      allergens: ['peanut'],
      prompt: 'system instructions',
      response: { ok: 1 },
      payload: { raw: 'provider data' },
    });

    expect(out.password).toBe('[REDACTED]');
    expect(out.token).toBe('[REDACTED]');
    expect(out.apiKey).toBe('[REDACTED]');
    expect(out.api_key).toBe('[REDACTED]');
    expect(out.authorization).toBe('[REDACTED]');
    expect(out.credential).toBe('[REDACTED]');
    expect(out.payment).toBe('[REDACTED]');
    expect(out.cvv).toBe('[REDACTED]');
    expect(out.allergens).toBe('[REDACTED]');
    expect(out.prompt).toBe('[REDACTED]');
    expect(out.response).toBe('[REDACTED]');
    expect(out.payload).toBe('[REDACTED]');
  });

  it('preserves the §7 allowed opaque ids', () => {
    const out = redact({
      restaurant_id: 'r1',
      location_id: 'l1',
      device_id: 'd1',
      session_id: 's1',
    });
    expect(out).toEqual({
      restaurant_id: 'r1',
      location_id: 'l1',
      device_id: 'd1',
      session_id: 's1',
    });
  });

  it('redacts sensitive value shapes regardless of key name', () => {
    expect(redact({ header: 'Bearer abc.def' }).header).toBe('[REDACTED]');
    expect(redact({ jwt: 'eyJabc.def.ghi' }).jwt).toBe('[REDACTED]');
    expect(redact({ a: 'tok_abc123' }).a).toBe('[REDACTED]');
    expect(redact({ b: 'pm_abc123' }).b).toBe('[REDACTED]');
  });

  it('walks nested objects and arrays', () => {
    const out = redact([
      { password: 'p' },
      { keep: 'yes', nested: { secret: 's', location_id: 'l1' } },
    ]);
    const first = out.at(0);
    const second = out.at(1);
    expect(first?.password).toBe('[REDACTED]');
    expect(second?.keep).toBe('yes');
    expect(second?.nested?.secret).toBe('[REDACTED]');
    expect(second?.nested?.location_id).toBe('l1');
  });

  it('does not mutate the input', () => {
    const input = { password: 'p', nested: { token: 't' } };
    redact(input);
    expect(input.password).toBe('p');
    expect(input.nested.token).toBe('t');
  });
});
