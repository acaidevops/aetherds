import type { ApiError } from '../validation/errors';

/**
 * Default HTTP status for a sanitized API error code.
 *
 * api-contracts.md §10 is code-driven: the stable `code` is the source of truth
 * on the wire. This map gives each code a canonical default status so route
 * handlers stay thin. A route MAY document a different status for a specific
 * operation in OpenAPI, but the code (not the status) carries the meaning.
 */
export function statusForError(error: ApiError): number {
  switch (error.code) {
    case 'VALIDATION_FAILED':
      return 400;
    case 'AUTH_SCOPE_DENIED':
    case 'DEVICE_QUARANTINED':
      return 403;
    case 'RESOURCE_NOT_FOUND':
    case 'SESSION_NOT_ACTIVE':
      return 404;
    case 'STATE_VERSION_CONFLICT':
    case 'IDEMPOTENCY_KEY_REUSED':
      return 409;
    case 'CART_STALE':
    case 'ITEM_UNAVAILABLE':
    case 'PRICE_CHANGED':
    case 'ALLERGEN_DATA_UNKNOWN':
    case 'ALLERGY_CONFLICT':
    case 'SERVER_CONFIRMATION_REQUIRED':
    case 'ALCOHOL_VERIFICATION_REQUIRED':
      return 422;
    case 'RATE_LIMITED':
      return 429;
    case 'POS_UNAVAILABLE':
    case 'POS_CONFIRMATION_UNKNOWN':
      return 503;
    // No default: the union is exhaustive. A future code added without a branch
    // fails the build via the exhaustive switch, forcing an explicit decision.
  }
}
