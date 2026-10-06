import { NORMAL_DOMAINS, getDomainConfig } from "./domains";

export interface ApiClientOptions {
  credentials?: RequestCredentials;
}

export function resolveApiBaseUrl(): string {
  if (typeof window === "undefined") return NORMAL_DOMAINS.api;
  return getDomainConfig().api;
}

export type ApiErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "validation_error"
  | "rate_limited"
  | "server_error";

export interface ApiErrorResponse {
  code: ApiErrorCode | string;
  message: string;
  requestId?: string;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly requestId?: string;

  constructor(message: string, status: number, code: string, requestId?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

function resolveUrl(baseUrl: string, path: string) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    const errorPayload = payload as Partial<ApiErrorResponse> | null;
    throw new ApiClientError(
      errorPayload?.message ?? "Request failed",
      response.status,
      errorPayload?.code ?? "server_error",
      errorPayload?.requestId ?? response.headers.get("X-Request-ID") ?? undefined,
    );
  }

  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return payload as T;
}

export function createApiClient({
  credentials = "include",
}: ApiClientOptions = {}) {
  const resolvedBaseUrl = resolveApiBaseUrl();
  let csrfToken: string | undefined;

  const getCsrfToken = async () => {
    if (csrfToken) return csrfToken;
    const response = await fetch(resolveUrl(resolvedBaseUrl, "/auth/csrf"), {
      method: "GET",
      credentials,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new ApiClientError("Unable to initialize request protection", response.status, "csrf_error");
    const payload = (await response.json()) as { csrfToken?: unknown };
    if (typeof payload.csrfToken !== "string") {
      throw new ApiClientError("Invalid CSRF token response", response.status, "csrf_error");
    }
    csrfToken = payload.csrfToken;
    return csrfToken;
  };

  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const method = (init.method ?? "GET").toUpperCase();
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      headers.set("X-CSRF-Token", await getCsrfToken());
    }
    const response = await fetch(resolveUrl(resolvedBaseUrl, path), {
      ...init,
      credentials,
      headers: Object.fromEntries(headers.entries()),
    });

    return parseJsonResponse<T>(response);
  };

  return {
    request,
    get: <T>(path: string, init: RequestInit = {}) => request<T>(path, { ...init, method: "GET" }),
    post: <T>(path: string, body: unknown, init: RequestInit = {}) =>
      request<T>(path, {
        ...init,
        method: "POST",
        body: JSON.stringify(body),
      }),
    patch: <T>(path: string, body: unknown, init: RequestInit = {}) =>
      request<T>(path, {
        ...init,
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: <T>(path: string, init: RequestInit = {}) => request<T>(path, { ...init, method: "DELETE" }),
  };
}

export async function getCurrentSession<T = unknown>() {
  const client = createApiClient({ credentials: "same-origin" });
  return client.get<T>("/auth/session");
}

export async function getCurrentUser<T = unknown>() {
  const client = createApiClient({ credentials: "same-origin" });
  return client.get<T>("/users/me");
}

export {
  getDomainConfig,
  NORMAL_DOMAINS,
  WORKERS_DEV_DOMAINS,
} from "./domains";
export {
  fetchModrinthProjectVersion,
  fetchModrinthProjectVersions,
  getPackVersion,
} from "./modrinth";
export type { ModrinthVersion } from "./modrinth";
