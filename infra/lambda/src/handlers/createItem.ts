import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { docClient, ITEMS_TABLE } from "../shared/dynamo.js";
import { success, error } from "../shared/response.js";

const CreateItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  price: z.number().int().positive(),
  imageUrl: z.string().url().optional(),
  productUrl: z.string().url().optional(),
  priority: z.enum(["must_have", "nice_to_have", "dream"]).optional(),
  category: z.string().max(100).optional(),
  metadata: z
    .object({
      ogTitle: z.string().optional(),
      ogImage: z.string().optional(),
      ogSite: z.string().optional(),
    })
    .optional(),
});

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body ?? "{}");
    const parsed = CreateItemSchema.safeParse(body);

    if (!parsed.success) {
      return error(400, "VALIDATION_ERROR", "Invalid request body", {
        issues: parsed.error.issues,
      });
    }

    const data = parsed.data;
    const id = uuidv4();
    const now = new Date().toISOString();

    const item = {
      entityType: "WishlistItem",
      id,
      name: data.name,
      description: data.description,
      price: data.price,
      imageUrl: data.imageUrl,
      productUrl: data.productUrl,
      status: "available",
      totalContributed: 0,
      priority: data.priority,
      category: data.category,
      metadata: data.metadata,
      isSplitGift: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
      GSI1PK: "ITEMS",
      GSI1SK: `STATUS#available#UPDATED#${now}`,
    };

    await docClient.send(
      new PutCommand({
        TableName: ITEMS_TABLE,
        Item: item,
        ConditionExpression: "attribute_not_exists(id)",
      }),
    );

    return success(201, { item });
  } catch (err) {
    console.error("createItem error:", err);
    if (err instanceof SyntaxError) {
      return error(400, "PARSE_ERROR", "Invalid JSON in request body");
    }
    return error(500, "INTERNAL_ERROR", "Failed to create item");
  }
}
