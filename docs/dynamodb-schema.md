# DynamoDB Schema Reference

This document describes the complete DynamoDB schema for the housewarming wishlist web app MVP.

---

## Tables

### Primary Table: `WishlistApp`

| Attribute | Type | Description |
|-----------|------|-------------|
| PK | String | Partition key |
| SK | String | Sort key |
| entityType | String | Entity discriminator |
| createdAt | String | ISO 8601 timestamp |
| updatedAt | String | ISO 8601 timestamp |
| version | Number | Optimistic locking version |

---

### Entity Definitions

#### 1. WishlistItem

Represents a wishlist item that guests can reserve or contribute toward.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| PK | String | ✓ | `ITEM#{id}` |
| SK | String | ✓ | `META` |
| entityType | String | ✓ | `WishlistItem` |
| id | String | ✓ | Unique item ID (UUID) |
| name | String | ✓ | Display name |
| description | String | | Item description |
| price | Number | ✓ | Price in cents |
| imageUrl | String | | Image URL |
| productUrl | String | | Link to product |
| status | String | ✓ | Enum: `available` \| `reserved` \| `partially_funded` \| `funded` |
| totalContributed | Number | ✓ | Total contributions in cents (default: 0) |
| reservedByName | String | | Name of person who reserved (if reserved) |
| isSplitGift | Boolean | ✓ | Whether item allows split contributions |
| metadata | Map | | Open Graph metadata: `ogTitle`, `ogImage`, `ogSite` |
| priority | String | | Enum: `must_have` \| `nice_to_have` \| `dream` |
| category | String | | Item category |
| version | Number | ✓ | Incremented on each update (optimistic locking) |
| createdAt | String | ✓ | ISO 8601 |
| updatedAt | String | ✓ | ISO 8601 |
| **GSI1PK** | String | ✓ | `ITEMS` |
| **GSI1SK** | String | ✓ | `STATUS#{status}#UPDATED#{updatedAt}` |

---

#### 2. Reservation

Represents a reservation of an item by a guest (full-price reservation).

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| PK | String | ✓ | `ITEM#{itemId}` |
| SK | String | ✓ | `RES#{reservationId}` |
| entityType | String | ✓ | `Reservation` |
| id | String | ✓ | Unique reservation ID (UUID) |
| itemId | String | ✓ | Reference to WishlistItem |
| name | String | ✓ | Guest's display name |
| normalizedName | String | ✓ | Normalized name for uniqueness (trim, lowercase, collapse whitespace) |
| amount | Number | | Optional — reserved amount in cents (typically = item price) |
| createdAt | String | ✓ | ISO 8601 |

---

#### 3. Contribution

Represents a partial contribution toward a split-gift item.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| PK | String | ✓ | `ITEM#{itemId}` |
| SK | String | ✓ | `CON#{contributionId}` |
| entityType | String | ✓ | `Contribution` |
| id | String | ✓ | Unique contribution ID (UUID) |
| itemId | String | ✓ | Reference to WishlistItem |
| contributorName | String | ✓ | Contributor's display name |
| normalizedContributorName | String | ✓ | Normalized name |
| amount | Number | ✓ | Amount in cents |
| createdAt | String | ✓ | ISO 8601 |

---

### Auxiliary Table: `ReservationNameLocks`

Enforces unique reservation names per item. Used to prevent duplicate reservations under the same name.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| PK | String | ✓ | `ITEM#{itemId}` |
| SK | String | ✓ | `NAME#{normalizedName}` |

**Creation**: Must use `attribute_not_exists(PK)` (or `attribute_not_exists(SK)`) condition within `TransactWriteItems` when creating a reservation.

---

### Auxiliary Table: `IdempotencyKeys`

Prevents duplicate processing of retried requests.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| PK | String | ✓ | `IDEMP#{requestId}` |
| result | Map | | Cached response from original request |
| createdAt | String | ✓ | ISO 8601 |
| ttl | Number | ✓ | Unix timestamp for DynamoDB TTL (expire after 24h) |

---

## GSIs

### GSI1 on `WishlistApp`

| Attribute | Purpose |
|-----------|---------|
| GSI1PK | Partition key |
| GSI1SK | Sort key |

- **Projection**: ALL
- **Purpose**: List and filter items by status, sorted by `updatedAt`

**WishlistItem** populates:
- `GSI1PK` = `ITEMS`
- `GSI1SK` = `STATUS#{status}#UPDATED#{updatedAt}` (e.g. `STATUS#available#UPDATED#2025-03-18T12:00:00Z`)

---

### GSI2 (Optional MVP) on `WishlistApp`

| Attribute | Purpose |
|-----------|---------|
| GSI2PK | Partition key |
| GSI2SK | Sort key |

- **GSI2PK** = `ITEM#{itemId}`
- **GSI2SK** = `EVENT#{createdAt}` (ISO 8601)
- **Purpose**: Admin timeline of reservations and contributions for an item (chronological)

---

## Example JSON Records

### WishlistItem

```json
{
  "PK": "ITEM#a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "SK": "META",
  "entityType": "WishlistItem",
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Kitchen Mixer",
  "description": "Stand mixer for baking",
  "price": 29999,
  "imageUrl": "https://example.com/mixer.jpg",
  "productUrl": "https://example.com/product/123",
  "status": "available",
  "totalContributed": 0,
  "isSplitGift": false,
  "metadata": {
    "ogTitle": "Professional Stand Mixer",
    "ogImage": "https://example.com/mixer-og.jpg",
    "ogSite": "example.com"
  },
  "priority": "must_have",
  "category": "Kitchen",
  "version": 1,
  "createdAt": "2025-03-18T10:00:00Z",
  "updatedAt": "2025-03-18T10:00:00Z",
  "GSI1PK": "ITEMS",
  "GSI1SK": "STATUS#available#UPDATED#2025-03-18T10:00:00Z"
}
```

### Reservation

```json
{
  "PK": "ITEM#a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "SK": "RES#r1r2r3r4-r5r6-7890-abcd-ef1234567890",
  "entityType": "Reservation",
  "id": "r1r2r3r4-r5r6-7890-abcd-ef1234567890",
  "itemId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Alice Smith",
  "normalizedName": "alice smith",
  "amount": 29999,
  "createdAt": "2025-03-18T11:30:00Z"
}
```

### Contribution

```json
{
  "PK": "ITEM#b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "SK": "CON#c1c2c3c4-c5c6-7890-abcd-ef1234567890",
  "entityType": "Contribution",
  "id": "c1c2c3c4-c5c6-7890-abcd-ef1234567890",
  "itemId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "contributorName": "Bob Johnson",
  "normalizedContributorName": "bob johnson",
  "amount": 5000,
  "createdAt": "2025-03-18T12:00:00Z"
}
```

### ReservationNameLocks

```json
{
  "PK": "ITEM#a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "SK": "NAME#alice smith"
}
```

### IdempotencyKeys

```json
{
  "PK": "IDEMP#req-abc123-def456-ghi789",
  "result": {
    "statusCode": 201,
    "body": { "id": "r1r2r3r4-r5r6-7890-abcd-ef1234567890" }
  },
  "createdAt": "2025-03-18T11:30:00Z",
  "ttl": 1710858600
}
```

---

## Enums Reference

| Enum | Values |
|------|--------|
| status | `available`, `reserved`, `partially_funded`, `funded` |
| priority | `must_have`, `nice_to_have`, `dream` |
