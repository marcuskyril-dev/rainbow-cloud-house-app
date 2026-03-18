import type { ApiError } from "./types";

const API_BASE_URL_DEV_RAW =
  import.meta.env.VITE_API_BASE_URL_DEV ?? undefined;
const API_BASE_URL_PROD_RAW =
  import.meta.env.VITE_API_BASE_URL_PROD ?? undefined;

function resolveApiBaseUrl(): string {
  // This runs in the browser after Vite boots, so we can pick the stage dynamically
  // using the current host.
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host.endsWith(".localhost");

    const base = isLocal ? API_BASE_URL_DEV_RAW : API_BASE_URL_PROD_RAW;
    if (!base) {
      throw new Error(
        `Missing API base URL env var for current host. ` +
        `Using ${isLocal ? "VITE_API_BASE_URL_DEV" : "VITE_API_BASE_URL_PROD"}.`,
      );
    }
    return base;
  }

  // This app is expected to run in a browser; without `window`, we can't
  // reliably decide dev vs prod.
  throw new Error(
    "Cannot resolve API base URL outside browser context (missing window).",
  );
}

// Avoid double-slashes when the base URL comes from an env var that includes a trailing slash
// (common in Amplify examples like `.../dev/`).
const API_BASE_URL_RAW = resolveApiBaseUrl();

const API_BASE_URL = API_BASE_URL_RAW.replace(/\/+$/, "");

export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let getAuthToken: (() => Promise<string | null>) | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthTokenProvider(
  provider: () => Promise<string | null>,
): void {
  getAuthToken = provider;
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (getAuthToken) {
    const token = await getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    if (response.status === 401 && onUnauthorized) {
      // Ensure we don't throw away the original error, but do log the user out.
      try {
        onUnauthorized();
      } catch {
        // ignore
      }
    }
    throw new ApiClientError(
      response.status,
      body?.error?.code ?? "UNKNOWN_ERROR",
      body?.error?.message ?? `HTTP ${response.status}`,
      body?.error?.details,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
