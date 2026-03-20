import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { success, error } from "../shared/response.js";

const PresignSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileSize: z.number().int().positive().max(5 * 1024 * 1024),
});

const s3 = new S3Client({});

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const bucket = process.env.IMAGES_BUCKET;
    if (!bucket) {
      return error(500, "CONFIG_ERROR", "Missing IMAGES_BUCKET configuration");
    }

    const body = JSON.parse(event.body ?? "{}");
    const parsed = PresignSchema.safeParse(body);
    if (!parsed.success) {
      return error(400, "VALIDATION_ERROR", "Invalid request body", {
        issues: parsed.error.issues,
      });
    }

    const { fileName, contentType, fileSize } = parsed.data;
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
    const objectKey = `items/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: contentType,
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    const region = process.env.AWS_REGION ?? "ap-southeast-1";
    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;

    return success(200, { uploadUrl, objectKey, publicUrl });
  } catch (err) {
    console.error("presignUpload error:", err);
    if (err instanceof SyntaxError) {
      return error(400, "PARSE_ERROR", "Invalid JSON in request body");
    }
    return error(500, "INTERNAL_ERROR", "Failed to generate upload URL");
  }
}
