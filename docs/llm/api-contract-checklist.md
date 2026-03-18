# API Contract Checklist

Checklist for implementing or modifying API endpoints in the Rainbow Cloud House Wishlist.

---

## Pre-Implementation

- [ ] Read the endpoint spec in `docs/api/openapi.yaml`
- [ ] Check `docs/api/error-model.md` for error codes and format
- [ ] Identify which DynamoDB access patterns are needed (`docs/access-patterns.md`)

---

## Implementation (Lambda)

- [ ] Lambda handler added in `infra/lambda/src/handlers/`
- [ ] Request body validated with a zod schema
- [ ] Idempotency check for public write endpoints (`reserve`, `contribute`)
- [ ] DynamoDB operations use `TransactWriteItems` for multi-entity writes
- [ ] `ConditionExpression`s used for updates (version checks, status guards)
- [ ] Response built with shared response helpers
- [ ] CORS headers included in responses

---

## Frontend Integration

- [ ] API function added in `src/shared/api/` (e.g. `reservations.ts`, `contributions.ts`)
- [ ] TanStack Query hook created in `src/shared/hooks/`
- [ ] Query invalidation on success for related queries
- [ ] Error handling catches `ApiClientError` and branches on `code`
- [ ] Loading states handled in UI
- [ ] Optimistic updates considered (optional for MVP)

---

## Testing

- [ ] Happy path tested manually
- [ ] Error cases tested (400, 409, 404)
- [ ] Race condition scenarios tested for write endpoints
- [ ] Idempotency tested (double submit with same `requestId`)
