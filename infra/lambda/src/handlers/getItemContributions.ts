import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, CONTRIBUTIONS_TABLE } from "../shared/dynamo.js";
import { success, error } from "../shared/response.js";

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const itemId = event.pathParameters?.id;
    if (!itemId) {
      return error(400, "MISSING_PARAM", "Item ID is required");
    }

    const { Items = [] } = await docClient.send(
      new QueryCommand({
        TableName: CONTRIBUTIONS_TABLE,
        KeyConditionExpression: "itemId = :itemId",
        ExpressionAttributeValues: {
          ":itemId": itemId,
        },
        ScanIndexForward: false,
      }),
    );

    return success(200, { contributions: Items });
  } catch (err) {
    console.error("getItemContributions error:", err);
    return error(500, "INTERNAL_ERROR", "Failed to fetch contributions");
  }
}

