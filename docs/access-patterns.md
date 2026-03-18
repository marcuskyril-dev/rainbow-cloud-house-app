# Access Patterns

This document describes all DynamoDB access patterns for the housewarming wishlist web app MVP.

---

## Access Pattern Summary

| # | Access Pattern | Table | Key Condition | Filter | Notes |
|---|----------------|-------|---------------|--------|-------|
| 1 | List all items | WishlistApp (GSI1) | GSI1PK = `ITEMS` | none | Sorted by `updatedAt` descending via GSI1SK |
| 2 | Filter items by status | WishlistApp (GSI1) | GSI1PK = `ITEMS`, GSI1SK `begins_with` `STATUS#{status}` | none | e.g. `STATUS#available`, `STATUS#reserved` |
| 3 | Get item by ID | WishlistApp | PK = `ITEM#{id}`, SK = `META` | none | Single-item read |
| 4 | List reservations for item | WishlistApp | PK = `ITEM#{itemId}`, SK `begins_with` `RES#` | none | Query by partition |
| 5 | List contributions for item | WishlistApp | PK = `ITEM#{itemId}`, SK `begins_with` `CON#` | none | Query by partition |
| 6 | Get item + all related | WishlistApp | PK = `ITEM#{itemId}` | none | Returns META + all RES# + all CON# rows |
| 7 | Check name lock exists | ReservationNameLocks | PK = `ITEM#{itemId}`, SK = `NAME#{normalizedName}` | none | ConditionCheck or GetItem |
| 8 | Check idempotency key | IdempotencyKeys | PK = `IDEMP#{requestId}` | none | GetItem before processing |

---

## Detailed Access Patterns

### 1. List all items

- **Table**: WishlistApp
- **Index**: GSI1
- **Operation**: Query
- **Key**: `GSI1PK = "ITEMS"`
- **Sort**: GSI1SK desc (newest first)
- **Result**: All WishlistItem records

### 2. Filter items by status

- **Table**: WishlistApp
- **Index**: GSI1
- **Operation**: Query
- **Key**: `GSI1PK = "ITEMS"` AND `GSI1SK begins_with "STATUS#available"`
- **Result**: Only items with matching status, sorted by `updatedAt`

### 3. Get item by ID

- **Table**: WishlistApp
- **Operation**: GetItem
- **Key**: `PK = "ITEM#{id}"`, `SK = "META"`
- **Result**: Single WishlistItem

### 4. List reservations for item

- **Table**: WishlistApp
- **Operation**: Query
- **Key**: `PK = "ITEM#{itemId}"`, `SK begins_with "RES#"`
- **Result**: All Reservation records for the item

### 5. List contributions for item

- **Table**: WishlistApp
- **Operation**: Query
- **Key**: `PK = "ITEM#{itemId}"`, `SK begins_with "CON#"`
- **Result**: All Contribution records for the item

### 6. Get item + all related (compound read)

- **Table**: WishlistApp
- **Operation**: Query
- **Key**: `PK = "ITEM#{itemId}"`
- **Result**: One META row (item), all RES# rows (reservations), all CON# rows (contributions)

### 7. Check name lock exists

- **Table**: ReservationNameLocks
- **Operation**: GetItem or ConditionCheck
- **Key**: `PK = "ITEM#{itemId}"`, `SK = "NAME#{normalizedName}"`
- **Result**: Used to detect if name is already reserved; `attribute_not_exists` used when creating lock

### 8. Check idempotency key

- **Table**: IdempotencyKeys
- **Operation**: GetItem
- **Key**: `PK = "IDEMP#{requestId}"`
- **Result**: If exists, return cached `result`; otherwise proceed and store result with TTL

---

## Concurrency Control

### TransactWriteItems for Reservations (4 operations)

When creating a reservation, a single `TransactWriteItems` ensures atomicity:

1. **ConditionCheck** on WishlistApp: `PK = ITEM#{itemId}`, `SK = META`
   - Condition: `status = "available"` (or equivalent)
   - Fails if item is already reserved or otherwise unavailable

2. **Put** on ReservationNameLocks: `PK = ITEM#{itemId}`, `SK = NAME#{normalizedName}`
   - Condition: `attribute_not_exists(PK)` or `attribute_not_exists(SK)`
   - Fails if this name is already reserved for this item (unique constraint)

3. **Put** on WishlistApp: New Reservation record (`PK = ITEM#{itemId}`, `SK = RES#{reservationId}`)

4. **Update** on WishlistApp: WishlistItem (`PK = ITEM#{itemId}`, `SK = META`)
   - Set `status = "reserved"`, `reservedByName`, `updatedAt`
   - Increment `version` (optimistic locking)
   - Condition: `version = {expectedVersion}` to prevent overwrites

All four operations succeed or fail together.

---

### TransactWriteItems for Contributions (3 operations)

When creating a contribution (split gift):

1. **ConditionCheck** on WishlistApp: `PK = ITEM#{itemId}`, `SK = META`
   - Condition: `isSplitGift = true` AND `totalContributed + amount <= price`
   - Prevents over-funding

2. **Put** on WishlistApp: New Contribution record (`PK = ITEM#{itemId}`, `SK = CON#{contributionId}`)

3. **Update** on WishlistApp: WishlistItem (`PK = ITEM#{itemId}`, `SK = META`)
   - Add `amount` to `totalContributed`
   - Set `status` = `partially_funded` (if total < price) or `funded` (if total >= price)
   - Update `updatedAt`, increment `version`
   - Condition: `version = {expectedVersion}`

---

### Version-Based Optimistic Locking

- Each WishlistItem has a `version` (number) attribute
- Every update to an item must include a condition: `version = {currentVersion}`
- After a successful update, the new version is returned; the client uses it for the next update
- If another process updates the item first, the condition fails and the transaction aborts
- Client should re-read the item and retry with the new version

---

### Name Normalization

Reservation names are normalized before checking uniqueness:

1. **Trim**: Remove leading/trailing whitespace
2. **Lowercase**: Convert to lowercase (e.g. `"Alice Smith"` → `"alice smith"`)
3. **Collapse whitespace**: Replace multiple consecutive spaces with a single space (e.g. `"Alice   Smith"` → `"alice smith"`)

The `normalizedName` is stored in both the Reservation and the ReservationNameLocks table. The display `name` is stored unmodified for presentation.

---

## Item Status State Machine

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                                                             │
                    ▼                                                             │
              ┌───────────┐     full reservation      ┌──────────┐                │
              │ available │ ────────────────────────► │ reserved │                │
              └───────────┘                           └──────────┘                │
                    │                                       │                     │
                    │ contribution                          │ admin unreserve     │
                    │ (total < price)                       ▼                     │
                    │                                 ┌───────────┐               │
                    ▼                                 │ available │◄──────────────┘
              ┌──────────────────┐                    └───────────┘
              │ partially_funded │
              └──────────────────┘
                    │
                    │ contribution(s)
                    │ (total >= price)
                    ▼
              ┌──────────┐
              │  funded  │
              └──────────┘

              Any status ──► archived (admin soft-delete when reservations/contributions exist)
```

### Transitions

| From | To | Trigger |
|------|-----|---------|
| `available` | `reserved` | Full reservation (guest reserves entire item) |
| `available` | `partially_funded` | First contribution received, total < price |
| `partially_funded` | `partially_funded` | Additional contribution, total still < price |
| `partially_funded` | `funded` | Contribution(s) bring totalContributed >= price |
| `reserved` | `available` | Admin unreserve |
| Any | `archived` | Admin soft-delete (when reservations or contributions exist) |

### Notes

- `reserved` and `funded` are terminal states for guest actions; only admin can change them (unreserve, archive)
- `archived` is used when the item has activity (reservations/contributions) and admin wants to hide it without losing history
