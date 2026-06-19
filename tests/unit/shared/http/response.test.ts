import { describe, expect, it } from 'vitest';

import { apiErrorResponse, apiResponse, statusForError } from '@/shared/http';
import { CORRELATION_HEADER } from '@/shared/observability';
import { ApiError, type ErrorCode } from '@/shared/validation';

function errorWith(code: ErrorCode): ApiError {
  return new ApiError({ code, message: 'message', correlationId: 'corr_1' });
}

describe('statusForError', () => {
  const cases: [ErrorCode, number][] = [
    ['VALIDATION_FAILED', 400],
    ['AUTH_SCOPE_DENIED', 403],
    ['DEVICE_QUARANTINED', 403],
    ['RESOURCE_NOT_FOUND', 404],
    ['SESSION_NOT_ACTIVE', 404],
    ['STATE_VERSION_CONFLICT', 409],
    ['IDEMPOTENCY_KEY_REUSED', 409],
    ['CART_STALE', 422],
    ['ITEM_UNAVAILABLE', 422],
    ['ALLERGY_CONFLICT', 422],
    ['SERVER_CONFIRMATION_REQUIRED', 422],
    ['ALCOHOL_VERIFICATION_REQUIRED', 422],
    ['RATE_LIMITED', 429],
    ['POS_UNAVAILABLE', 503],
    ['POS_CONFIRMATION_UNKNOWN', 503],
  ];

  for (const [code, status] of cases) {
    it(`maps ${code} to ${status}`, () => {
      expect(statusForError(errorWith(code))).toBe(status);
    });
  }
});

describe('apiResponse', () => {
  it('serializes a body with default 200 and the correlation header', async () => {
    const res = apiResponse({ ok: true }, { correlationId: 'corr_1' });
    expect(res.status).toBe(200);
    expect(res.headers.get(CORRELATION_HEADER)).toBe('corr_1');
    expect(await res.json()).toEqual({ ok: true });
  });

  it('honors a custom status and extra headers', async () => {
    const res = apiResponse(
      { created: true },
      {
        status: 201,
        correlationId: 'corr_2',
        headers: { 'x-aether-test': 'yes' },
      },
    );
    expect(res.status).toBe(201);
    expect(res.headers.get('x-aether-test')).toBe('yes');
  });
});

describe('apiErrorResponse', () => {
  it('serializes the error envelope with the canonical status', async () => {
    const error = new ApiError({
      code: 'CART_STALE',
      message: 'Your cart changed.',
      action: 'REVIEW_CART',
      correlationId: 'corr_3',
    });
    const res = apiErrorResponse(error);
    expect(res.status).toBe(422);
    expect(res.headers.get(CORRELATION_HEADER)).toBe('corr_3');
    expect(await res.json()).toEqual({
      error: {
        code: 'CART_STALE',
        message: 'Your cart changed.',
        action: 'REVIEW_CART',
        correlationId: 'corr_3',
      },
    });
  });

  it('overrides the correlation id when one is supplied', async () => {
    const error = new ApiError({
      code: 'VALIDATION_FAILED',
      message: 'bad',
      correlationId: 'corr_old',
    });
    const res = apiErrorResponse(error, 'corr_new');
    const body = await res.json();
    expect(body.error.correlationId).toBe('corr_new');
    expect(res.headers.get(CORRELATION_HEADER)).toBe('corr_new');
  });
});
