import {
  NORMAL_DOMAINS,
  usesFirstPartyApi,
} from "./domains";

export interface ApiClientOptions {
  credentials?: RequestCredentials;
  clientId?: string;
}

interface AppAccessToken {
  token: string;
  expiresAt: number;
}

const appAccessTokens = new Map<string, AppAccessToken>();
const appRefreshRequests = new Map<string, Promise<string | null>>();
const csrfTokens = new Map<string, string>();
const csrfRequests = new Map<string, Promise<string>>();

export function clearAppAccessToken(clientId: string) {
  appAccessTokens.delete(clientId);
}

export function resolveApiBaseUrl(
  normalApiBaseUrl = NORMAL_DOMAINS.api,
  origin = typeof window === "undefined" ? undefined : window.location.origin,
): string {
  if (!origin) return normalApiBaseUrl;
  return usesFirstPartyApi(origin) ? "/api/v1" : normalApiBaseUrl;
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

  constructor(
    message: string,
    status: number,
    code: string,
    requestId?: string,
  ) {
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
      errorPayload?.requestId ??
        response.headers.get("X-Request-ID") ??
        undefined,
    );
  }

  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return payload as T;
}

export function createApiClient({
  credentials = "include",
  clientId,
}: ApiClientOptions = {}) {
  const resolvedBaseUrl = resolveApiBaseUrl();
  const csrfCacheKey = `${resolvedBaseUrl}:${clientId ?? "session"}`;
  const getCsrfToken = async () => {
    const cached = csrfTokens.get(csrfCacheKey);
    if (cached) return cached;
    const pending = csrfRequests.get(csrfCacheKey);
    if (pending) return pending;

    const csrfRequest = (async () => {
      const csrfPath = clientId
        ? `/auth/csrf?client_id=${encodeURIComponent(clientId)}`
        : "/auth/csrf";
      const response = await fetch(resolveUrl(resolvedBaseUrl, csrfPath), {
        method: "GET",
        credentials,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new ApiClientError(
          "Unable to initialize request protection",
          response.status,
          "csrf_error",
        );
      }
      const payload = (await response.json()) as { csrfToken?: unknown };
      if (typeof payload.csrfToken !== "string") {
        throw new ApiClientError(
          "Invalid CSRF token response",
          response.status,
          "csrf_error",
        );
      }
      csrfTokens.set(csrfCacheKey, payload.csrfToken);
      return payload.csrfToken;
    })();
    csrfRequests.set(csrfCacheKey, csrfRequest);
    try {
      return await csrfRequest;
    } finally {
      if (csrfRequests.get(csrfCacheKey) === csrfRequest) {
        csrfRequests.delete(csrfCacheKey);
      }
    }
  };

  const refreshAppAccessToken = async (
    force = false,
  ): Promise<string | null> => {
    if (!clientId || typeof window === "undefined") return null;
    const current = appAccessTokens.get(clientId);
    if (!force && current && current.expiresAt > Date.now() + 30_000)
      return current.token;

    const pending = appRefreshRequests.get(clientId);
    if (pending) return pending;

    const performRefresh = async (): Promise<string | null> => {
      try {
        const csrf = await getCsrfToken();
        const response = await fetch(
          resolveUrl(resolvedBaseUrl, "/auth/refresh"),
          {
            method: "POST",
            credentials,
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-CSRF-Token": csrf,
            },
            body: JSON.stringify({ client_id: clientId }),
          },
        );
        if (!response.ok) {
          appAccessTokens.delete(clientId);
          return null;
        }
        const payload = (await response.json()) as {
          access_token?: unknown;
          expires_in?: unknown;
        };
        if (
          typeof payload.access_token !== "string" ||
          typeof payload.expires_in !== "number"
        ) {
          appAccessTokens.delete(clientId);
          return null;
        }
        appAccessTokens.set(clientId, {
          token: payload.access_token,
          expiresAt: Date.now() + payload.expires_in * 1000,
        });
        return payload.access_token;
      } catch {
        appAccessTokens.delete(clientId);
        return null;
      }
    };
    const refreshRequest = performRefresh();
    appRefreshRequests.set(clientId, refreshRequest);
    try {
      return await refreshRequest;
    } finally {
      if (appRefreshRequests.get(clientId) === refreshRequest) {
        appRefreshRequests.delete(clientId);
      }
    }
  };

  const request = async <T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> => {
    const method = (init.method ?? "GET").toUpperCase();
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const canUseAppToken = Boolean(
      clientId &&
      typeof window !== "undefined" &&
      !["/auth/session", "/auth/csrf", "/auth/token", "/auth/refresh"].includes(
        normalizedPath,
      ),
    );
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    let accessToken = canUseAppToken ? await refreshAppAccessToken() : null;
    if (accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      headers.set("X-CSRF-Token", await getCsrfToken());
    }
    const fetchRequest = () =>
      fetch(resolveUrl(resolvedBaseUrl, path), {
        ...init,
        credentials,
        headers: Object.fromEntries(headers.entries()),
      });
    let response = await fetchRequest();
    if (response.status === 401 && accessToken && canUseAppToken && clientId) {
      headers.delete("Authorization");
      accessToken = await refreshAppAccessToken(true);
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
        response = await fetchRequest();
      }
    }

    return parseJsonResponse<T>(response);
  };

  return {
    request,
    get: <T>(path: string, init: RequestInit = {}) =>
      request<T>(path, { ...init, method: "GET" }),
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
    delete: <T>(path: string, init: RequestInit = {}) =>
      request<T>(path, { ...init, method: "DELETE" }),
    clearAccessToken: () => {
      if (clientId) clearAppAccessToken(clientId);
      csrfTokens.delete(csrfCacheKey);
    },
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
