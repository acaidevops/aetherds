/**
 * Public surface for the shared HTTP helpers.
 *
 * Route handlers use these to produce contract-compliant responses (correlation
 * header + sanitized error envelope) without duplicating serialization. See
 * api-contracts.md §1 and §10.
 */
export { apiResponse, apiErrorResponse, type ApiResponseInit } from './response';
export { statusForError } from './status';
