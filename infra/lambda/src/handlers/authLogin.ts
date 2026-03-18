import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { error, success } from "../shared/response.js";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
});

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1];
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body ?? "{}");
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return error(400, "VALIDATION_ERROR", "Invalid request body", {
        issues: parsed.error.issues,
      });
    }

    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!clientId) {
      return error(500, "CONFIG_ERROR", "Missing Cognito client configuration");
    }

    const { email, password } = parsed.data;

    const cognito = new CognitoIdentityProviderClient({});
    const resp = await cognito.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      }),
    );

    const idToken = resp.AuthenticationResult?.IdToken;
    if (!idToken) {
      return error(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const payload = decodeJwtPayload(idToken) ?? {};
    const groups = Array.isArray(payload["cognito:groups"])
      ? (payload["cognito:groups"] as unknown[]).filter(
        (g): g is string => typeof g === "string",
      )
      : [];

    // Frontend expects { token, user } shape.
    return success(200, {
      token: idToken,
      user: { email, groups },
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return error(400, "PARSE_ERROR", "Invalid JSON in request body");
    }
    // Cognito returns various 4xx errors; don’t leak details.
    return error(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
}

