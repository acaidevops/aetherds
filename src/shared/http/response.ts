import 'server-only';

import { NextResponse } from 'next/server';

import { CORRELATION_HEADER } from '../observability/correlation';
import { type ApiError } from '../validation/errors';
import { statusForError } from './status';

/**
 * Shared HTTP response helpers (api-contracts.md §1, §10).
 *
 * Every response carries the `x-correlation-id` header. Success bodies are the
 * resource/projection verbatim; errors use the sanitized {@link ApiError}
 * envelope and never leak stack traces, provider payloads, or secrets.
 *
 * `server-only` is imported so these helpers — and any secret-bearing call site
 * that depends on them — can never be bundled into the client (acceptance
 * criterion A1: "No environment secret exposed to client bundle").
 */

export interface ApiResponseInit {
  readonly status?: number;
  readonly correlationId: string;
  readonly headers?: Readonly<Record<string, string>>;
}

/** Serialize a successful body with the correlation header. */
export function apiResponse(body: unknown, init: ApiResponseInit): NextResponse {
  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: {
      [CORRELATION_HEADER]: init.correlationId,
      ...init.headers,
    },
  });
}

/**
 * Serialize an {@link ApiError} into the contract error envelope with its
 * canonical status. The correlation id defaults to the one already on the error
 * but can be overridden with the request's resolved id.
 */
export function apiErrorResponse(
  error: ApiError,
  correlationId: string = error.correlationId,
): NextResponse {
  return NextResponse.json(
    { error: { ...error.toJSON().error, correlationId } },
    {
      status: statusForError(error),
      headers: { [CORRELATION_HEADER]: correlationId },
    },
  );
}
