import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export const WISHLIST_TABLE = process.env.WISHLIST_TABLE ?? "WishlistApp";
export const ITEMS_TABLE = process.env.ITEMS_TABLE ?? "WishlistItems";
export const CONTRIBUTIONS_TABLE =
  process.env.CONTRIBUTIONS_TABLE ?? "WishlistContributions";
export const IDEMPOTENCY_TABLE =
  process.env.IDEMPOTENCY_TABLE ?? "IdempotencyKeys";
