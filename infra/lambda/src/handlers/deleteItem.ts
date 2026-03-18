import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { QueryCommand, DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, ITEMS_TABLE, CONTRIBUTIONS_TABLE } from "../shared/dynamo.js";
import { success, error } from "../shared/response.js";

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const itemId = event.pathParameters?.id;
    if (!itemId) {
      return error(400, "MISSING_PARAM", "Item ID is required");
    }

    // Check if item has contributions (if so, archive instead of deleting)
    const { Items: relatedRecords = [] } = await docClient.send(
      new QueryCommand({
        TableName: CONTRIBUTIONS_TABLE,
        KeyConditionExpression: "itemId = :itemId",
        ExpressionAttributeValues: {
          ":itemId": itemId,
        },
        Limit: 1,
      }),
    );

    const hasActivity = relatedRecords.length > 0;

    if (hasActivity) {
      const now = new Date().toISOString();
      await docClient.send(
        new UpdateCommand({
          TableName: ITEMS_TABLE,
          Key: { id: itemId },
          UpdateExpression:
            "SET #status = :archived, updatedAt = :now, version = version + :one, GSI1SK = :gsi1sk",
          ConditionExpression: "attribute_exists(id)",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":archived": "archived",
            ":now": now,
            ":one": 1,
            ":gsi1sk": `STATUS#archived#UPDATED#${now}`,
          },
        }),
      );
    } else {
      await docClient.send(
        new DeleteCommand({
          TableName: ITEMS_TABLE,
          Key: { id: itemId },
          ConditionExpression: "attribute_exists(id)",
        }),
      );
    }

    return success(204, null);
  } catch (err) {
    console.error("deleteItem error:", err);
    return error(500, "INTERNAL_ERROR", "Failed to delete item");
  }
}
