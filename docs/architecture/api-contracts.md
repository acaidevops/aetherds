# API Contracts

Status: Application contract baseline. SpotOn provider contracts remain provisional until sandbox verification.

The machine-readable source of truth is
[`openapi.yaml`](openapi.yaml). This document explains cross-cutting behavior
and lists the intended literal routes. A route is implementation-ready only
when its OpenAPI operation defines security, parameters, request and response
schemas, success status, and expected error responses.

## 1. Conventions

- Base path: `/api/v1`
- JSON request/response bodies
- UTC ISO-8601 timestamps
- Money: `{ amountMinor, currency }`
- Intent-specific commands rather than generic status mutation
- Idempotency required for guest submission and provider-facing operations
- Optimistic concurrency through `expectedVersion`
- Correlation ID on every request and response
- Sanitized errors with stable machine codes
- OpenAPI 3.1 validation in CI

### Success status rules

- `200` returns the current resource/projection after a synchronous command.
- `201` returns a newly created resource.
- `202` means durable work was persisted for asynchronous processing.
- `204` means the command succeeded and has no response representation.

### Pagination

Collection endpoints use opaque cursor pagination:

- `cursor`: cursor returned by the previous page
- `limit`: 1–100, default 25
- response: `{ items, nextCursor }`

Cursors are scoped to the authenticated query and cannot be reused to expand
tenant, location, role, or filter scope.

### Idempotency

Commands that can create duplicate business effects require
`Idempotency-Key`, formatted as a UUID. The server stores the authenticated
principal, route, normalized request hash, status, and response for at least
24 hours.

- Same key, principal, route, and body returns the original response.
- Same key with a different body returns `409 IDEMPOTENCY_KEY_REUSED`.
- A provider retry reuses the immutable provider reference; it does not use a
  new application idempotency key.

### Optimistic concurrency

Mutable resources expose an integer `version`. Commands carry
`expectedVersion`. A mismatch returns `409 STATE_VERSION_CONFLICT` with the
current version and no partial mutation.

## 2. Authentication contexts

| Context | Credential |
|---|---|
| Guest device | Revocable device credential + active session capability |
| Staff | Individual Supabase Auth session + location membership/role |
| Platform operator | Strongly authenticated operator role; support session where applicable |
| SpotOn webhook | Verified provider signature/replay controls |
| Background worker | Server-side service identity |

Each operation declares one or more of these security schemes in OpenAPI.
Authentication does not imply authorization. Route handlers derive
restaurant/location scope and enforce the command-specific role:

- Guest device: its bound table and active session only
- Server: assigned location and permitted/owned operational work
- Manager/owner: location administration and explicit privileged commands
- Food-safety approver: independently authorized safety approval
- Platform operator: audited platform scope; support session where required

## 3. Guest/session endpoints

```text
GET    /api/v1/device/context
GET    /api/v1/public/menu
POST   /api/v1/sessions/{sessionId}/privacy-lock
POST   /api/v1/sessions/{sessionId}/resume
GET    /api/v1/sessions/{sessionId}
PUT    /api/v1/sessions/{sessionId}/preferences
POST   /api/v1/sessions/{sessionId}/diners
PATCH  /api/v1/sessions/{sessionId}/diners/{dinerId}
DELETE /api/v1/sessions/{sessionId}/diners/{dinerId}
```

Staff lifecycle commands:

```text
POST /api/v1/tables/{tableId}/sessions
POST /api/v1/sessions/{sessionId}/transfer
POST /api/v1/sessions/{sessionId}/pause-ordering
POST /api/v1/sessions/{sessionId}/reopen-ordering
POST /api/v1/sessions/{sessionId}/close
```

## 4. Menu and recommendation endpoints

```text
GET  /api/v1/locations/{locationId}/menu
GET  /api/v1/menu/items/{itemId}
POST /api/v1/sessions/{sessionId}/recommendations
POST /api/v1/sessions/{sessionId}/recommendation-feedback
POST /api/v1/sessions/{sessionId}/compare
```

Recommendation responses contain only validated item IDs and structured reasons. AI prose is optional presentation data.

## 5. Cart and order endpoints

```text
GET    /api/v1/sessions/{sessionId}/cart
POST   /api/v1/sessions/{sessionId}/cart/items
PATCH  /api/v1/sessions/{sessionId}/cart/items/{cartItemId}
DELETE /api/v1/sessions/{sessionId}/cart/items/{cartItemId}
POST   /api/v1/sessions/{sessionId}/cart/validate
POST   /api/v1/sessions/{sessionId}/order-batches
POST   /api/v1/order-batches/{batchId}/withdraw
POST   /api/v1/order-batches/{batchId}/accept-review
POST   /api/v1/order-batches/{batchId}/approve
POST   /api/v1/order-batches/{batchId}/decline
POST   /api/v1/order-batches/{batchId}/propose-revision
POST   /api/v1/order-batches/{batchId}/confirm-revision
POST   /api/v1/order-batches/{batchId}/resolve-pos-ambiguity
```

Creating an order batch requires:

- `Idempotency-Key`
- `expectedCartVersion`
- `menuVersion`
- explicit guest confirmation marker

Approval requires:

- server ownership
- current immutable batch version
- allergy review status
- alcohol verification where applicable
- valid SpotOn employee attribution mode

## 6. Service requests

```text
POST /api/v1/sessions/{sessionId}/service-requests
POST /api/v1/service-requests/{requestId}/accept
POST /api/v1/service-requests/{requestId}/start
POST /api/v1/service-requests/{requestId}/complete
POST /api/v1/service-requests/{requestId}/cancel
POST /api/v1/service-requests/{requestId}/no-longer-needed
```

## 7. Staff operations

```text
GET  /api/v1/staff/live-floor
POST /api/v1/locations/{locationId}/sections
POST /api/v1/tables/{tableId}/assign-server
POST /api/v1/devices/provision
POST /api/v1/devices/{deviceId}/reassign
POST /api/v1/devices/{deviceId}/quarantine
POST /api/v1/locations/{locationId}/pause
POST /api/v1/locations/{locationId}/resume
```

## 8. Menu administration

```text
GET  /api/v1/admin/menu/staging
POST /api/v1/admin/menu/items/{mappingId}/enrichment-versions
POST /api/v1/admin/menu/enrichment/{versionId}/submit-review
POST /api/v1/admin/menu/enrichment/{versionId}/approve
POST /api/v1/admin/menu/enrichment/{versionId}/approve-safety
POST /api/v1/admin/menu/enrichment/{versionId}/publish
POST /api/v1/admin/menu/enrichment/{versionId}/archive
POST /api/v1/admin/menu/enrichment/{versionId}/restore
```

## 9. Webhooks and internal jobs

```text
POST /api/v1/webhooks/spoton
POST /api/v1/internal/jobs/spoton-reconcile
POST /api/v1/internal/jobs/menu-reconcile
POST /api/v1/internal/jobs/session-auto-close
POST /api/v1/internal/jobs/request-escalation
```

Internal routes require service authentication and cannot be invoked by clients.

## 10. Error model

```json
{
  "error": {
    "code": "CART_STALE",
    "message": "Your cart changed because menu information was updated.",
    "action": "REVIEW_CART",
    "correlationId": "corr_..."
  }
}
```

Required codes include:

- `AUTH_SCOPE_DENIED`
- `SESSION_NOT_ACTIVE`
- `STATE_VERSION_CONFLICT`
- `CART_STALE`
- `ITEM_UNAVAILABLE`
- `PRICE_CHANGED`
- `ALLERGEN_DATA_UNKNOWN`
- `ALLERGY_CONFLICT`
- `SERVER_CONFIRMATION_REQUIRED`
- `ALCOHOL_VERIFICATION_REQUIRED`
- `POS_UNAVAILABLE`
- `POS_CONFIRMATION_UNKNOWN`
- `RATE_LIMITED`
- `DEVICE_QUARANTINED`
- `IDEMPOTENCY_KEY_REUSED`
- `VALIDATION_FAILED`
- `RESOURCE_NOT_FOUND`

## 11. Security rules

- Derive tenant/location scope from authenticated membership/device context.
- Validate every transition server-side.
- Do not accept arbitrary field patches.
- Apply rate limits per device, session, IP, user, and command.
- Never return provider payloads, stack traces, secrets, or internal notes.
- Treat out-of-scope resources as `404` when revealing existence would leak
  tenant or table information.
