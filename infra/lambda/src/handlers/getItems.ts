import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, ITEMS_TABLE } from "../shared/dynamo.js";
import { success, error } from "../shared/response.js";

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const status = event.queryStringParameters?.status;

    const keyCondition = status
      ? "GSI1PK = :pk AND begins_with(GSI1SK, :skPrefix)"
      : "GSI1PK = :pk";

    const expressionValues: Record<string, string> = { ":pk": "ITEMS" };
    if (status) {
      expressionValues[":skPrefix"] = `STATUS#${status}`;
    }

    const { Items = [] } = await docClient.send(
      new QueryCommand({
        TableName: ITEMS_TABLE,
        IndexName: "GSI1",
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: expressionValues,
        ScanIndexForward: false,
      }),
    );

    return success(200, { items: Items });
  } catch (err) {
    console.error("getItems error:", err);
    return error(500, "INTERNAL_ERROR", "Failed to fetch items");
  }
}
