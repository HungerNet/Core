export interface ApiClientOptions {
  baseUrl?: string;
  credentials?: RequestCredentials;
  origin?: string;
}

const WORKERS_DEV_HOST_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+millered001\.workers\.dev$/i;
const WORKERS_ACCOUNTS_HOST = "accounts.millered001.workers.dev";
const WORKERS_DEV_API_BASE_URL = "https://api.hacklets.dev";

export function resolveApiBaseUrl(
  configuredBaseUrl = "/api/v1",
  origin?: string,
): string {
  const runtimeOrigin = origin ?? (typeof location === "undefined" ? undefined : location.origin);
  if (!runtimeOrigin) return configuredBaseUrl;

  try {
    const parsedOrigin = new URL(runtimeOrigin);
    const hostname = parsedOrigin.hostname.toLowerCase();
    const matchesWorkersDomain =
      parsedOrigin.protocol === "https:" &&
      WORKERS_DEV_HOST_PATTERN.test(hostname) &&
      !parsedOrigin.username &&
      !parsedOrigin.password &&
      !parsedOrigin.port &&
      parsedOrigin.pathname === "/" &&
      !parsedOrigin.search &&
      !parsedOrigin.hash;
    if (!matchesWorkersDomain) return configuredBaseUrl;

    const apiPath = new URL(configuredBaseUrl, parsedOrigin).pathname.replace(/\/+$/, "");
    if (hostname === WORKERS_ACCOUNTS_HOST) return apiPath || "/api/v1";
    return `${WORKERS_DEV_API_BASE_URL}${apiPath}`;
  } catch {
    return configuredBaseUrl;
  }
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
  baseUrl = "/api/v1",
  credentials = "include",
  origin,
}: ApiClientOptions = {}) {
  const resolvedBaseUrl = resolveApiBaseUrl(baseUrl, origin);
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

export async function getCurrentSession<T = unknown>(baseUrl = "/api/v1", origin?: string) {
  const client = createApiClient({ baseUrl, credentials: "same-origin", origin });
  return client.get<T>("/auth/session");
}

export async function getCurrentUser<T = unknown>(baseUrl = "/api/v1", origin?: string) {
  const client = createApiClient({ baseUrl, credentials: "same-origin", origin });
  return client.get<T>("/users/me");
}

export {
  fetchModrinthProjectVersion,
  fetchModrinthProjectVersions,
  getPackVersion,
} from "./modrinth";
export type { ModrinthVersion } from "./modrinth";
