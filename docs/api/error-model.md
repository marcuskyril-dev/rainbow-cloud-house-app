# API Error Model

This document describes the standard error response format and all error codes used by the Rainbow Cloud House Wishlist API.

## Standard Error Response

All API errors return a consistent JSON structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

| Field      | Type   | Required | Description                                                    |
|------------|--------|----------|----------------------------------------------------------------|
| `code`     | string | Yes      | Machine-readable error code (see table below)                  |
| `message`  | string | Yes      | Human-readable description suitable for display to the user    |
| `details`  | object | No       | Additional context (e.g., validation failures, field names)   |

## Error Codes Reference

| Code                  | HTTP Status | When                                                                 |
|-----------------------|-------------|----------------------------------------------------------------------|
| `VALIDATION_ERROR`    | 400         | Request body or query parameters fail validation                     |
| `UNAUTHORIZED`        | 401         | Missing or invalid JWT for admin endpoints                            |
| `FORBIDDEN`           | 403         | Valid JWT but user not in admin group                                |
| `ITEM_NOT_FOUND`      | 404         | Item ID does not exist                                               |
| `NAME_TAKEN`          | 409         | Reservation name already used for this item                          |
| `ITEM_NOT_RESERVABLE` | 409         | Item status does not allow reservation                               |
| `VERSION_CONFLICT`    | 409         | Optimistic lock failed; item version is stale                        |
| `OVERPAYMENT`         | 409         | Contribution would exceed remaining amount needed                    |
| `HAS_RESERVATIONS`    | 409         | Cannot hard-delete item with reservations or contributions           |
| `URL_UNREACHABLE`     | 422         | Metadata fetch URL could not be reached                              |
| `OG_NOT_FOUND`        | 422         | No OpenGraph metadata found at the provided URL                      |
| `IDEMPOTENCY_CONFLICT`| 409         | Same `requestId` reused with different payload                       |
| `INTERNAL_ERROR`      | 500         | Unexpected server error                                               |

## Idempotency

The **reserve** and **contribute** endpoints support idempotent requests to safely retry operations (e.g., after network failures) without creating duplicate reservations or contributions.

### Requirements

- Both endpoints require a `requestId` in the request body.
- `requestId` must be a valid **UUID v4**.

### Behavior

1. **First request with a given `requestId`**  
   The server processes the request, stores the result keyed by `requestId` with a 24-hour TTL, and returns the `201` response.

2. **Same `requestId` with identical payload**  
   The server returns the cached `201` response without reprocessing. This is safe for retries.

3. **Same `requestId` with different payload**  
   The server returns `409 IDEMPOTENCY_CONFLICT`. This indicates the same idempotency key was used for a different operation, which may be a client bug or security concern.

### Example

```bash
# First request – creates reservation
curl -X POST /api/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "abc123",
    "name": "Alice",
    "amount": 50,
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }'
# → 201 { reservation: {...}, item: {...} }

# Retry with same payload (e.g., network retry)
curl -X POST /api/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "abc123",
    "name": "Alice",
    "amount": 50,
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }'
# → 201 { same cached response }

# Same requestId, different payload
curl -X POST /api/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "abc123",
    "name": "Bob",
    "amount": 75,
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }'
# → 409 IDEMPOTENCY_CONFLICT
```
