---
name: wishlist-dynamodb-writes
description: >-
  Transactional DynamoDB write patterns for the housewarming wishlist app. Use when implementing reservation logic, contribution logic, item updates with optimistic locking, or handling race conditions. Triggers on mentions of DynamoDB, TransactWriteItems, ConditionExpression, concurrency, race condition, or name uniqueness.
---

# DynamoDB Write Patterns

## Tables
- WishlistApp: PK/SK, main entity store
- ReservationNameLocks: PK=ITEM#{id}, SK=NAME#{normalized}
- IdempotencyKeys: PK=IDEMP#{requestId}, TTL 24h

## Key Patterns
| Entity | PK | SK |
|---|---|---|
| Item | ITEM#{id} | META |
| Reservation | ITEM#{itemId} | RES#{reservationId} |
| Contribution | ITEM#{itemId} | CON#{contributionId} |

## Reservation Transaction (4 ops)
1. ConditionCheck item status = 'available'
2. Put name lock with attribute_not_exists(PK)
3. Put reservation record
4. Update item: status='reserved', version+1

## Contribution Transaction (3 ops)
1. ConditionCheck totalContributed + amount <= price
2. Put contribution record
3. Update item: totalContributed += amount, status='partially_funded' or 'funded', version+1

## Error Mapping
Parse TransactionCanceledException.CancellationReasons:
- Index 0 failed → ITEM_NOT_RESERVABLE (item status wrong)
- Index 1 failed → NAME_TAKEN (lock already exists)
- Index 3 failed → VERSION_CONFLICT

## Name Normalization
trim().toLowerCase().replace(/\s+/g, ' ')

## Optimistic Locking
Always include `ConditionExpression: 'version = :v'` on item updates.
