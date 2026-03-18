import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const endpoint = process.env.AWS_ENDPOINT;
const client = new DynamoDBClient(endpoint ? { endpoint } : {});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const WISHLIST_TABLE = process.env.WISHLIST_TABLE ?? "WishlistApp";

type ItemKey = { PK: string; SK: string };

async function fetchReservedItemKeys(): Promise<ItemKey[]> {
  const keys: ItemKey[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  while (true) {
    const res = await docClient.send(
      new QueryCommand({
        TableName: WISHLIST_TABLE,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": "ITEMS",
          ":skPrefix": "STATUS#reserved",
        },
        ProjectionExpression: "PK, SK",
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    for (const item of res.Items ?? []) {
      if (typeof item.PK === "string" && typeof item.SK === "string") {
        keys.push({ PK: item.PK, SK: item.SK });
      }
    }

    if (!res.LastEvaluatedKey) break;
    lastEvaluatedKey = res.LastEvaluatedKey as Record<string, unknown>;
  }

  return keys;
}

async function migrateItemToAvailable(key: ItemKey): Promise<void> {
  const now = new Date().toISOString();
  await docClient.send(
    new UpdateCommand({
      TableName: WISHLIST_TABLE,
      Key: key,
      ConditionExpression: "attribute_exists(PK) AND #status = :reserved",
      UpdateExpression:
        "SET #status = :available, updatedAt = :now, version = version + :one, GSI1SK = :gsi1sk REMOVE reservedByName",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":reserved": "reserved",
        ":available": "available",
        ":now": now,
        ":one": 1,
        ":gsi1sk": `STATUS#available#UPDATED#${now}`,
      },
    }),
  );
}

async function main() {
  console.log(`Migrating reserved items to available in table: ${WISHLIST_TABLE}`);

  const keys = await fetchReservedItemKeys();
  console.log(`Found ${keys.length} reserved items`);

  let migrated = 0;
  for (const key of keys) {
    await migrateItemToAvailable(key);
    migrated += 1;
  }

  console.log(`Done. Migrated ${migrated} items to available.`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

