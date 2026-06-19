/**
 * Sanitized API error model (api-contracts.md §10).
 *
 * Errors carry a stable machine code, a human message, an actionable next step,
 * and a correlation id. They never leak stack traces, provider payloads,
 * secrets, or internal notes.
 */

export type ErrorCode =
  | 'AUTH_SCOPE_DENIED'
  | 'SESSION_NOT_ACTIVE'
  | 'STATE_VERSION_CONFLICT'
  | 'CART_STALE'
  | 'ITEM_UNAVAILABLE'
  | 'PRICE_CHANGED'
  | 'ALLERGEN_DATA_UNKNOWN'
  | 'ALLERGY_CONFLICT'
  | 'SERVER_CONFIRMATION_REQUIRED'
  | 'ALCOHOL_VERIFICATION_REQUIRED'
  | 'POS_UNAVAILABLE'
  | 'POS_CONFIRMATION_UNKNOWN'
  | 'RATE_LIMITED'
  | 'DEVICE_QUARANTINED'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'VALIDATION_FAILED'
  | 'RESOURCE_NOT_FOUND';

export type ErrorAction =
  | 'REVIEW_CART'
  | 'RETRY'
  | 'SIGN_IN'
  | 'CONTACT_STAFF'
  | 'AWAIT_RECONCILIATION';

export interface ApiErrorShape {
  readonly code: ErrorCode;
  readonly message: string;
  readonly action?: ErrorAction;
  readonly correlationId: string;
}

export class ApiError extends Error implements ApiErrorShape {
  readonly code: ErrorCode;
  readonly action?: ErrorAction;
  readonly correlationId: string;

  constructor(input: ApiErrorShape) {
    super(input.message);
    this.name = 'ApiError';
    this.code = input.code;
    this.action = input.action;
    this.correlationId = input.correlationId;
  }

  toJSON(): { error: ApiErrorShape } {
    return {
      error: {
        code: this.code,
        message: this.message,
        action: this.action,
        correlationId: this.correlationId,
      },
    };
  }
}
