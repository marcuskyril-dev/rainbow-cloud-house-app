# DynamoDB Transaction Patterns

Reference patterns for DynamoDB transactions in the Rainbow Cloud House Wishlist.

---

## Pattern 1: Reserve Item

Single `TransactWriteItems` with 4 operations. The handler must read the item first (GetItem) to obtain `expectedVersion` for the Update condition.

```typescript
const params = {
  TransactItems: [
    // 1. Condition check: item is available
    {
      ConditionCheck: {
        TableName: WISHLIST_TABLE,
        Key: { PK: { S: `ITEM#${itemId}` }, SK: { S: "META" } },
        ConditionExpression: "#status = :available",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":available": { S: "available" } },
      },
    },
    // 2. Put name lock (unique per item)
    {
      Put: {
        TableName: NAME_LOCKS_TABLE,
        Item: {
          PK: { S: `ITEM#${itemId}` },
          SK: { S: `NAME#${normalizedName}` },
        },
        ConditionExpression: "attribute_not_exists(PK)",
      },
    },
    // 3. Put reservation record
    {
      Put: {
        TableName: WISHLIST_TABLE,
        Item: {
          PK: { S: `ITEM#${itemId}` },
          SK: { S: `RES#${reservationId}` },
          itemId: { S: itemId },
          name: { S: name },
          amount: { N: String(amount ?? 0) },
          createdAt: { S: new Date().toISOString() },
        },
      },
    },
    // 4. Update item
    {
      Update: {
        TableName: WISHLIST_TABLE,
        Key: { PK: { S: `ITEM#${itemId}` }, SK: { S: "META" } },
        UpdateExpression:
          "SET #status = :reserved, reservedByName = :name, version = version + :one, updatedAt = :now",
        ConditionExpression: "version = :expectedVersion",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":reserved": { S: "reserved" },
          ":name": { S: name },
          ":one": { N: "1" },
          ":now": { S: new Date().toISOString() },
          ":expectedVersion": { N: String(expectedVersion) },
        },
      },
    },
  ],
};
```

---

## Pattern 2: Contribute to Item

Single `TransactWriteItems` with 3 operations. Read the item first to obtain `expectedVersion` and current `totalContributed`/`price`.

```typescript
const params = {
  TransactItems: [
    // 1. Condition check: split gift and totalContributed + amount <= price
    {
      ConditionCheck: {
        TableName: WISHLIST_TABLE,
        Key: { PK: { S: `ITEM#${itemId}` }, SK: { S: "META" } },
        ConditionExpression:
          "isSplitGift = :true AND totalContributed + :amount <= price AND version = :expectedVersion",
        ExpressionAttributeValues: {
          ":true": { BOOL: true },
          ":amount": { N: String(amount) },
          ":expectedVersion": { N: String(expectedVersion) },
        },
      },
    },
    // 2. Put contribution record
    {
      Put: {
        TableName: WISHLIST_TABLE,
        Item: {
          PK: { S: `ITEM#${itemId}` },
          SK: { S: `CON#${contributionId}` },
          itemId: { S: itemId },
          contributorName: { S: contributorName },
          amount: { N: String(amount) },
          createdAt: { S: new Date().toISOString() },
        },
      },
    },
    // 3. Update item (add to totalContributed, set status)
    {
      Update: {
        TableName: WISHLIST_TABLE,
        Key: { PK: { S: `ITEM#${itemId}` }, SK: { S: "META" } },
        UpdateExpression:
          "SET totalContributed = totalContributed + :amount, #status = :newStatus, version = version + :one, updatedAt = :now",
        ConditionExpression: "version = :expectedVersion",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":amount": { N: String(amount) },
          ":newStatus": { S: newTotal >= price ? "funded" : "partially_funded" },
          ":one": { N: "1" },
          ":now": { S: new Date().toISOString() },
          ":expectedVersion": { N: String(expectedVersion) },
        },
      },
    },
  ],
};
```

---

## Pattern 3: Optimistic Locking for Item Update

Use `version` in `ConditionExpression` on every item update:

```typescript
{
  Update: {
    TableName: WISHLIST_TABLE,
    Key: { PK: { S: `ITEM#${itemId}` }, SK: { S: "META" } },
    UpdateExpression: "SET #name = :name, version = version + :one, updatedAt = :now",
    ConditionExpression: "version = :expectedVersion",
    ExpressionAttributeNames: { "#name": "name" },
    ExpressionAttributeValues: {
      ":name": { S: newName },
      ":one": { N: "1" },
      ":now": { S: new Date().toISOString() },
      ":expectedVersion": { N: String(expectedVersion) },
    },
  },
}
```

Client must send `expectedVersion` from the last read. If the condition fails, return 409 `VERSION_CONFLICT`.

---

## Error Handling: TransactionCanceledException

Parse `TransactionCanceledException.CancellationReasons` to determine which condition failed:

```typescript
import { DynamoDBClient, TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";

try {
  await client.send(new TransactWriteItemsCommand(params));
} catch (err) {
  if (err.name === "TransactionCanceledException") {
    const reasons = err.CancellationReasons ?? [];
    // Index matches TransactItems order (0 = first, 1 = second, ...)
    const failedIndex = reasons.findIndex((r) => r.Code === "ConditionalCheckFailed");
    if (failedIndex >= 0) {
      // Map by operation:
      // 0 -> ITEM_NOT_RESERVABLE (status not available)
      // 1 -> NAME_TAKEN (name lock already exists)
      // 3 or 4 -> VERSION_CONFLICT (version mismatch)
      // For contribute: 0 -> OVERPAYMENT or VERSION_CONFLICT, 2 -> VERSION_CONFLICT
      const code = mapFailureToErrorCode(failedIndex, operationType);
      return errorResponse(409, code, "Appropriate message");
    }
  }
  throw err;
}
```

| Failure index (Reserve) | Error code          |
|-------------------------|---------------------|
| 0                       | `ITEM_NOT_RESERVABLE` |
| 1                       | `NAME_TAKEN`        |
| 3                       | `VERSION_CONFLICT`   |

| Failure index (Contribute) | Error code        |
|----------------------------|-------------------|
| 0                          | `OVERPAYMENT` or `VERSION_CONFLICT` |
| 2                          | `VERSION_CONFLICT` |

---

## Name Normalization

Apply before checking name uniqueness and storing the lock:

```typescript
function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
```

Examples: `"Alice   Smith"` → `"alice smith"`, `"  Bob  "` → `"bob"`.

Store the original `name` for display; use `normalizedName` for lock keys and uniqueness checks.
