import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  type ScanCommandInput,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const endpoint = process.env.AWS_ENDPOINT;
const client = new DynamoDBClient(endpoint ? { endpoint } : {});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const OLD_WISHLIST_TABLE = process.env.WISHLIST_TABLE ?? "WishlistApp";
const ITEMS_TABLE = process.env.ITEMS_TABLE ?? "WishlistItems";
const CONTRIBUTIONS_TABLE =
  process.env.CONTRIBUTIONS_TABLE ?? "WishlistContributions";

type OldItem = Record<string, unknown> & {
  PK?: string;
  SK?: string;
  id?: string;
  entityType?: string;
  totalContributed?: number;
};

type OldContribution = Record<string, unknown> & {
  PK?: string;
  SK?: string;
  id?: string;
  itemId?: string;
  createdAt?: string;
  amount?: number;
};

function isOldItemMeta(row: OldItem): boolean {
  return row.SK === "META" && row.entityType === "WishlistItem" && !!row.id;
}

function isOldContribution(row: OldContribution): boolean {
  return (
    typeof row.SK === "string" &&
    row.SK.startsWith("CON#") &&
    row.entityType === "Contribution" &&
    typeof row.itemId === "string" &&
    typeof row.id === "string"
  );
}

function isOldReservation(row: Record<string, unknown> & { SK?: string }): boolean {
  return typeof row.SK === "string" && row.SK.startsWith("RES#");
}

async function scanAll(
  scan: ScanCommandInput,
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  while (true) {
    const res = await docClient.send(
      new ScanCommand({
        ...scan,
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );
    out.push(...(res.Items ?? []));
    if (!res.LastEvaluatedKey) break;
    lastEvaluatedKey = res.LastEvaluatedKey as Record<string, unknown>;
  }

  return out;
}

async function migrateItems(): Promise<OldItem[]> {
  const rows = (await scanAll({
    TableName: OLD_WISHLIST_TABLE,
    ProjectionExpression:
      "PK, SK, entityType, id, #name, description, price, imageUrl, productUrl, #status, totalContributed, isSplitGift, category, priority, metadata, version, createdAt, updatedAt, GSI1PK, GSI1SK, reservedByName",
    ExpressionAttributeNames: {
      "#name": "name",
      "#status": "status",
    },
  })) as OldItem[];

  const items = rows.filter(isOldItemMeta);
  console.log(`Found ${items.length} items to migrate`);

  let written = 0;
  for (const item of items) {
    const { PK: _pk, SK: _sk, reservedByName: _reserved, ...rest } = item;
    await docClient.send(
      new PutCommand({
        TableName: ITEMS_TABLE,
        Item: {
          ...rest,
          status:
            rest.status === "reserved"
              ? "available"
              : (rest.status ?? "available"),
          reservedByName: undefined,
        },
        ConditionExpression: "attribute_not_exists(id)",
      }),
    );
    written += 1;
  }

  console.log(`Migrated ${written} items into ${ITEMS_TABLE}`);
  return items;
}

async function migrateContributions(): Promise<{
  perItemSum: Map<string, number>;
  written: number;
}> {
  const rows = (await scanAll({
    TableName: OLD_WISHLIST_TABLE,
    ProjectionExpression:
      "PK, SK, entityType, id, itemId, contributorName, normalizedContributorName, amount, createdAt",
  })) as OldContribution[];

  const contributions = rows.filter(isOldContribution);
  console.log(`Found ${contributions.length} contributions to migrate`);

  const perItemSum = new Map<string, number>();
  let written = 0;

  for (const c of contributions) {
    const createdAt =
      typeof c.createdAt === "string" ? c.createdAt : new Date().toISOString();
    const sk = `${createdAt}#${c.id}`;

    await docClient.send(
      new PutCommand({
        TableName: CONTRIBUTIONS_TABLE,
        Item: {
          ...c,
          PK: undefined,
          itemId: c.itemId,
          SK: sk,
        },
      }),
    );

    perItemSum.set(c.itemId!, (perItemSum.get(c.itemId!) ?? 0) + (c.amount ?? 0));
    written += 1;
  }

  console.log(`Migrated ${written} contributions into ${CONTRIBUTIONS_TABLE}`);
  return { perItemSum, written };
}

async function deleteOldReservations(): Promise<number> {
  const rows = await scanAll({
    TableName: OLD_WISHLIST_TABLE,
    ProjectionExpression: "PK, SK",
  });

  const reservations = rows.filter((r) => isOldReservation(r as any)) as Array<{
    PK: string;
    SK: string;
  }>;

  console.log(`Found ${reservations.length} reservation records to delete`);

  let deleted = 0;
  for (const r of reservations) {
    await docClient.send(
      new DeleteCommand({
        TableName: OLD_WISHLIST_TABLE,
        Key: { PK: r.PK, SK: r.SK },
      }),
    );
    deleted += 1;
  }

  console.log(`Deleted ${deleted} reservation records from ${OLD_WISHLIST_TABLE}`);
  return deleted;
}

async function main() {
  console.log("Split-table migration starting...");
  console.log(`OLD_WISHLIST_TABLE=${OLD_WISHLIST_TABLE}`);
  console.log(`ITEMS_TABLE=${ITEMS_TABLE}`);
  console.log(`CONTRIBUTIONS_TABLE=${CONTRIBUTIONS_TABLE}`);

  const items = await migrateItems();
  const { perItemSum } = await migrateContributions();

  let mismatches = 0;
  for (const item of items) {
    const expected = item.totalContributed ?? 0;
    const actual = perItemSum.get(item.id!) ?? 0;
    if (expected !== actual) {
      mismatches += 1;
      console.warn(
        `Mismatch for item ${item.id}: item.totalContributed=${expected} vs sum(contributions)=${actual}`,
      );
    }
  }
  if (mismatches > 0) {
    console.warn(`Validation finished with ${mismatches} mismatched items.`);
  } else {
    console.log("Validation finished. All per-item totals match.");
  }

  await deleteOldReservations();
  console.log("Split-table migration complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

