import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { z } from "zod";
import { docClient, ITEMS_TABLE } from "../shared/dynamo.js";
import { success, error } from "../shared/response.js";

const UpdateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  price: z.number().int().positive().optional(),
  imageUrl: z.string().url().nullable().optional(),
  productUrl: z.string().url().nullable().optional(),
  priority: z.enum(["must_have", "nice_to_have", "dream"]).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  status: z.enum(["available", "partially_funded", "funded", "archived"]).optional(),
  metadata: z
    .object({
      ogTitle: z.string().optional(),
      ogImage: z.string().optional(),
      ogSite: z.string().optional(),
    })
    .nullable()
    .optional(),
  expectedVersion: z.number().int().positive(),
});

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const itemId = event.pathParameters?.id;
    if (!itemId) {
      return error(400, "MISSING_PARAM", "Item ID is required");
    }

    const body = JSON.parse(event.body ?? "{}");
    const parsed = UpdateItemSchema.safeParse(body);

    if (!parsed.success) {
      return error(400, "VALIDATION_ERROR", "Invalid request body", {
        issues: parsed.error.issues,
      });
    }

    const { expectedVersion, ...updates } = parsed.data;
    const now = new Date().toISOString();

    // Read current item to get status for GSI1SK when status isn't being changed
    const { Item: currentItem } = await docClient.send(
      new GetCommand({
        TableName: ITEMS_TABLE,
        Key: { id: itemId },
        ProjectionExpression: "#status",
        ExpressionAttributeNames: { "#status": "status" },
      }),
    );

    if (!currentItem) {
      return error(404, "ITEM_NOT_FOUND", "Item does not exist");
    }

    const expressionParts: string[] = [];
    const expressionNames: Record<string, string> = {};
    const expressionValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      const attrName = `#${key}`;
      const attrValue = `:${key}`;
      expressionNames[attrName] = key;
      expressionValues[attrValue] = value;
      expressionParts.push(`${attrName} = ${attrValue}`);
    }

    expressionParts.push("updatedAt = :now");
    expressionValues[":now"] = now;

    expressionParts.push("version = version + :one");
    expressionValues[":one"] = 1;

    const effectiveStatus = updates.status ?? currentItem.status;
    expressionParts.push("GSI1SK = :gsi1sk");
    expressionValues[":gsi1sk"] = `STATUS#${effectiveStatus}#UPDATED#${now}`;

    expressionValues[":expectedVersion"] = expectedVersion;

    const result = await docClient.send(
      new UpdateCommand({
        TableName: ITEMS_TABLE,
        Key: { id: itemId },
        UpdateExpression: `SET ${expressionParts.join(", ")}`,
        ConditionExpression: "attribute_exists(id) AND version = :expectedVersion",
        ExpressionAttributeNames: Object.keys(expressionNames).length > 0 ? expressionNames : undefined,
        ExpressionAttributeValues: expressionValues,
        ReturnValues: "ALL_NEW",
      }),
    );

    return success(200, { item: result.Attributes });
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      return error(
        409,
        "VERSION_CONFLICT",
        "Item was modified by another request. Re-fetch and retry with the latest version.",
      );
    }

    console.error("updateItem error:", err);
    if (err instanceof SyntaxError) {
      return error(400, "PARSE_ERROR", "Invalid JSON in request body");
    }
    return error(500, "INTERNAL_ERROR", "Failed to update item");
  }
}
