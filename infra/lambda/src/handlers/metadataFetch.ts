import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { success, error } from "../shared/response.js";

const MetadataFetchSchema = z.object({
  productUrl: z.string().url(),
});

function decodeHtmlEntities(input: string) {
  return input
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function extractMeta(html: string) {
  const meta: Record<string, string> = {};
  const warnings: string[] = [];

  const metaTagRegex = /<meta\b[^>]*>/gi;
  const attrRegex = /([a-zA-Z_:.-]+)\s*=\s*["']([^"']*)["']/g;

  for (const tag of html.match(metaTagRegex) ?? []) {
    const attrs: Record<string, string> = {};
    let m: RegExpExecArray | null;
    while ((m = attrRegex.exec(tag))) {
      attrs[m[1].toLowerCase()] = m[2];
    }
    const content = attrs.content?.trim();
    const key = (attrs.property ?? attrs.name)?.trim().toLowerCase();
    if (!key || !content) continue;
    if (!(key in meta)) meta[key] = decodeHtmlEntities(content);
  }

  const titleMatch =
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  const title = decodeHtmlEntities(titleMatch.replace(/\s+/g, " ")).trim();

  const ogTitleCandidate = meta["og:title"] ?? meta["twitter:title"] ?? title;
  const ogTitle = ogTitleCandidate ? ogTitleCandidate : undefined;
  if (!meta["og:title"] && meta["twitter:title"] && ogTitle) {
    warnings.push("Fell back to twitter:title");
  } else if (!meta["og:title"] && title && ogTitle) {
    warnings.push("Fell back to <title>");
  }

  const ogDescription =
    meta["og:description"] ??
    meta["twitter:description"] ??
    meta["description"] ??
    undefined;

  const ogImage =
    meta["og:image"] ??
    meta["og:image:url"] ??
    meta["twitter:image"] ??
    undefined;

  const ogSite = meta["og:site_name"] ?? undefined;

  return {
    metadata: {
      title: ogTitle,
      description: ogDescription,
      imageUrl: ogImage,
      siteName: ogSite,
    },
    warnings: warnings.length ? warnings : undefined,
  };
}

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body ?? "{}");
    const parsed = MetadataFetchSchema.safeParse(body);
    if (!parsed.success) {
      return error(400, "VALIDATION_ERROR", "Invalid request body", {
        issues: parsed.error.issues,
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    let res: Response;
    try {
      res = await fetch(parsed.data.productUrl, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "RainbowCloudHouseWishlistBot/1.0 (+metadata fetch; admin autofill)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch {
      return error(422, "URL_UNREACHABLE", "The provided URL could not be reached.");
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      return error(422, "URL_UNREACHABLE", "The provided URL could not be reached.", {
        status: res.status,
      });
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      return error(422, "OG_NOT_FOUND", "No OpenGraph metadata found at the provided URL.");
    }

    const html = await res.text();
    const extracted = extractMeta(html);
    const hasAny =
      !!extracted.metadata.title ||
      !!extracted.metadata.description ||
      !!extracted.metadata.imageUrl ||
      !!extracted.metadata.siteName;

    if (!hasAny) {
      return error(422, "OG_NOT_FOUND", "No OpenGraph metadata found at the provided URL.");
    }

    return success(200, extracted);
  } catch (err) {
    console.error("metadataFetch error:", err);
    if (err instanceof SyntaxError) {
      return error(400, "PARSE_ERROR", "Invalid JSON in request body");
    }
    return error(500, "INTERNAL_ERROR", "Failed to fetch metadata");
  }
}

