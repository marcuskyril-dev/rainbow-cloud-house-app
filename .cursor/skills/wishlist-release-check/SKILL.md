---
name: wishlist-release-check
description: >-
  Pre-release verification checklist for the housewarming wishlist app. Use before deploying, merging to main, or when asked to verify readiness. Triggers on mentions of release, deploy, pre-launch, checklist, verification, or readiness check.
---

# Release Checklist

## Build Verification
- [ ] `npm run build` succeeds with no errors
- [ ] `npx tsc -b --noEmit` passes
- [ ] No console.log statements in production code
- [ ] Environment variables documented in .env.example

## Auth
- [ ] Admin endpoints reject requests without valid JWT
- [ ] Public endpoints work without auth
- [ ] Login flow works end-to-end
- [ ] Token refresh doesn't break session

## Data Integrity
- [ ] Reservations enforce unique names per item
- [ ] Contributions cannot exceed remaining price
- [ ] Double-submit with same requestId returns cached response
- [ ] Concurrent reservations on same item: one succeeds, other gets 409
- [ ] Item version increments on every update

## Edge Cases
- [ ] Broken product URL → metadata fetch returns 422 with warning
- [ ] Empty wishlist renders gracefully
- [ ] Long item names truncate properly
- [ ] Very large contribution amount rejected

## Frontend
- [ ] All modals close properly and reset forms
- [ ] Error messages display for each 409 code
- [ ] Loading spinners show during API calls
- [ ] Filter tabs work correctly
- [ ] Responsive layout on mobile/tablet/desktop

## Infrastructure
- [ ] CORS configured for production domain
- [ ] API Gateway throttling enabled
- [ ] DynamoDB TTL enabled on IdempotencyKeys table
- [ ] S3 bucket CORS configured for direct upload
- [ ] CloudWatch logging enabled on Lambdas
