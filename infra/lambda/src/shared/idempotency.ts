import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, IDEMPOTENCY_TABLE } from "./dynamo.js";

const TTL_SECONDS = 24 * 60 * 60; // 24 hours

export interface IdempotencyResult {
  statusCode: number;
  body: unknown;
}

export async function checkIdempotency(
  requestId: string,
): Promise<IdempotencyResult | null> {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: IDEMPOTENCY_TABLE,
      Key: { PK: `IDEMP#${requestId}` },
    }),
  );

  if (!Item) return null;

  return Item.result as IdempotencyResult;
}

export async function saveIdempotency(
  requestId: string,
  result: IdempotencyResult,
): Promise<void> {
  const now = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + TTL_SECONDS;

  await docClient.send(
    new PutCommand({
      TableName: IDEMPOTENCY_TABLE,
      Item: {
        PK: `IDEMP#${requestId}`,
        result,
        createdAt: now,
        ttl,
      },
    }),
  );
}
