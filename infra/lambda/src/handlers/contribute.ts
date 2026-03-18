import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TransactWriteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { docClient, ITEMS_TABLE, CONTRIBUTIONS_TABLE } from "../shared/dynamo.js";
import { success, error } from "../shared/response.js";
import { checkIdempotency, saveIdempotency } from "../shared/idempotency.js";

const ContributeSchema = z.object({
  itemId: z.string().uuid(),
  contributorName: z.string().min(1).max(100),
  amount: z.number().int().positive(),
  requestId: z.string().min(1).max(100),
});

function normalizeContributorName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body ?? "{}");
    const parsed = ContributeSchema.safeParse(body);

    if (!parsed.success) {
      return error(400, "VALIDATION_ERROR", "Invalid request body", {
        issues: parsed.error.issues,
      });
    }

    const { itemId, contributorName, amount, requestId } = parsed.data;

    const cached = await checkIdempotency(requestId);
    if (cached) {
      return success(cached.statusCode, cached.body);
    }

    const normalizedContributorName = normalizeContributorName(contributorName);
    const now = new Date().toISOString();

    // Fetch item to get current version and totals
    const { Item: currentItem } = await docClient.send(
      new GetCommand({
        TableName: ITEMS_TABLE,
        Key: { id: itemId },
      }),
    );

    if (!currentItem) {
      return error(404, "ITEM_NOT_FOUND", "Item does not exist");
    }

    if (currentItem.status === "funded" || currentItem.status === "archived") {
      return error(
        409,
        "ITEM_UNAVAILABLE",
        "Item is no longer accepting contributions",
      );
    }

    if (
      currentItem.status !== "available" &&
      currentItem.status !== "partially_funded"
    ) {
      return error(
        409,
        "ITEM_UNAVAILABLE",
        "Item is no longer accepting contributions",
      );
    }

    const newTotal = (currentItem.totalContributed ?? 0) + amount;
    if (newTotal > currentItem.price) {
      return error(
        409,
        "OVERPAYMENT",
        `Contribution would exceed item price. Maximum contribution: ${currentItem.price - (currentItem.totalContributed ?? 0)} cents`,
      );
    }

    const newStatus =
      newTotal >= currentItem.price ? "funded" : "partially_funded";
    const maxBefore = currentItem.price - amount;
    const contributionId = uuidv4();

    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: CONTRIBUTIONS_TABLE,
              Item: {
                itemId,
                SK: `${now}#${contributionId}`,
                entityType: "Contribution",
                id: contributionId,
                contributorName,
                normalizedContributorName,
                amount,
                createdAt: now,
              },
            },
          },
          {
            Update: {
              TableName: ITEMS_TABLE,
              Key: { id: itemId },
              ConditionExpression:
                "attribute_exists(id) AND #status IN (:available, :partial) AND totalContributed = :currentTotal AND version = :expectedVersion AND totalContributed <= :maxBefore",
              UpdateExpression:
                "SET totalContributed = :newTotal, #status = :newStatus, updatedAt = :now, version = version + :one, GSI1SK = :gsi1sk",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: {
                ":currentTotal": currentItem.totalContributed ?? 0,
                ":newTotal": newTotal,
                ":expectedVersion": currentItem.version,
                ":available": "available",
                ":partial": "partially_funded",
                ":newStatus": newStatus,
                ":now": now,
                ":one": 1,
                ":gsi1sk": `STATUS#${newStatus}#UPDATED#${now}`,
                ":maxBefore": maxBefore,
              },
            },
          },
        ],
      }),
    );

    const { Item: updatedItem } = await docClient.send(
      new GetCommand({
        TableName: ITEMS_TABLE,
        Key: { id: itemId },
      }),
    );

    const result = {
      contribution: {
        id: contributionId,
        itemId,
        contributorName,
        amount,
        newTotal,
        status: newStatus,
        createdAt: now,
      },
      item: updatedItem,
    };

    await saveIdempotency(requestId, { statusCode: 201, body: result });

    return success(201, result);
  } catch (err) {
    if (err instanceof TransactionCanceledException) {
      const reasons = err.CancellationReasons ?? [];

      if (reasons[1]?.Code === "ConditionalCheckFailed") {
        return error(
          409,
          "TRANSACTION_CONFLICT",
          "Contribution could not be applied — item was modified or is fully funded",
        );
      }

      return error(
        409,
        "TRANSACTION_CONFLICT",
        "Contribution could not be completed due to a conflict",
      );
    }

    console.error("contribute error:", err);
    if (err instanceof SyntaxError) {
      return error(400, "PARSE_ERROR", "Invalid JSON in request body");
    }
    return error(500, "INTERNAL_ERROR", "Failed to create contribution");
  }
}
