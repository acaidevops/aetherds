import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/validation';

describe('ApiError', () => {
  it('carries the stable code, message, action, and correlation id', () => {
    const err = new ApiError({
      code: 'CART_STALE',
      message: 'Your cart changed.',
      action: 'REVIEW_CART',
      correlationId: 'corr_1',
    });

    expect(err.name).toBe('ApiError');
    expect(err.code).toBe('CART_STALE');
    expect(err.action).toBe('REVIEW_CART');
    expect(err.correlationId).toBe('corr_1');
    expect(err.message).toBe('Your cart changed.');
  });

  it('omits the action when none is provided', () => {
    const err = new ApiError({
      code: 'VALIDATION_FAILED',
      message: 'bad',
      correlationId: 'corr_2',
    });
    expect(err.action).toBeUndefined();
  });

  it('serializes to the contract error envelope', () => {
    const err = new ApiError({
      code: 'AUTH_SCOPE_DENIED',
      message: 'no access',
      action: 'SIGN_IN',
      correlationId: 'corr_3',
    });
    expect(err.toJSON()).toEqual({
      error: {
        code: 'AUTH_SCOPE_DENIED',
        message: 'no access',
        action: 'SIGN_IN',
        correlationId: 'corr_3',
      },
    });
  });
});
