---
name: wishlist-api-contracts
description: >-
  Generate and update REST API endpoint specifications for the housewarming wishlist app. Use when creating new endpoints, modifying existing endpoints, adding validation rules, or updating error responses. Triggers on mentions of API, endpoint, route, Lambda handler, request/response schema, or error codes.
---

# Wishlist API Contracts

## Quick Reference
- OpenAPI spec: docs/api/openapi.yaml
- Error model: docs/api/error-model.md
- Lambda handlers: infra/lambda/src/handlers/

## Adding a New Endpoint

1. Define the endpoint in docs/api/openapi.yaml
2. Create Lambda handler in infra/lambda/src/handlers/{name}.ts
3. Add API client function in src/shared/api/{feature}.ts
4. Create TanStack Query hook in src/shared/hooks/

## Endpoint Implementation Checklist
- [ ] Validate request with zod
- [ ] Return standard error format: { error: { code, message, details? } }
- [ ] Include CORS headers via shared response helpers
- [ ] Add idempotency for public write endpoints
- [ ] Use TransactWriteItems for multi-entity mutations

## Standard Error Codes
| Code | HTTP | When |
|---|---|---|
| VALIDATION_ERROR | 400 | Invalid request body |
| UNAUTHORIZED | 401 | Missing/invalid JWT |
| FORBIDDEN | 403 | Not in admin group |
| ITEM_NOT_FOUND | 404 | Item doesn't exist |
| NAME_TAKEN | 409 | Reservation name exists for item |
| ITEM_NOT_RESERVABLE | 409 | Wrong item status |
| VERSION_CONFLICT | 409 | Stale version |
| OVERPAYMENT | 409 | Amount exceeds remaining |
| INTERNAL_ERROR | 500 | Unexpected |

## Lambda Handler Template
[Show the standard handler structure: parse event → validate → check idempotency → DynamoDB operation → response]

## Response Format
```typescript
// Success
{ statusCode: 201, headers: corsHeaders, body: JSON.stringify({ item }) }

// Error
{ statusCode: 409, headers: corsHeaders, body: JSON.stringify({ error: { code: "NAME_TAKEN", message: "..." } }) }
```
