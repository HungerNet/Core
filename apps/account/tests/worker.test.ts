import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveApiBaseUrl } from "@hungernet/api-client";
import accountWorker from "../worker";

describe("Account Workers API proxy", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses a same-origin API path for each first-party app", () => {
    expect(resolveApiBaseUrl("https://api.hungernet.dev/api/v1", "https://account.millered001.workers.dev"))
      .toBe("/api/v1");
    expect(resolveApiBaseUrl("/api/v1", "https://hungernet.millered001.workers.dev"))
      .toBe("/api/v1");
    expect(resolveApiBaseUrl("/api/v1", "https://admin.millered001.workers.dev"))
      .toBe("/api/v1");
    expect(resolveApiBaseUrl("https://api.hungernet.dev/api/v1", "https://account.hungernet.dev"))
      .toBe("/api/v1");
    expect(resolveApiBaseUrl("/api/v1", "https://ifamished.com"))
      .toBe("/api/v1");
  });

  it("forwards API requests with the Account origin and leaves static assets alone", async () => {
    const upstreamFetch = vi.fn(async () => new Response("proxied", { status: 200 }));
    const assetFetch = vi.fn(async () => new Response("static", { status: 200 }));
    vi.stubGlobal("fetch", upstreamFetch);
    const environment = { ASSETS: { fetch: assetFetch } };

    const apiResponse = await accountWorker.fetch(
      new Request("https://account.millered001.workers.dev/api/v1/auth/session?source=test"),
      environment,
    );
    const proxiedRequest = upstreamFetch.mock.calls[0]?.[0] as Request;

    expect(apiResponse.status).toBe(200);
    expect(await apiResponse.text()).toBe("proxied");
    expect(proxiedRequest.url).toBe("https://api.hacklets.dev/api/v1/auth/session?source=test");
    expect(proxiedRequest.headers.get("origin")).toBe("https://account.millered001.workers.dev");

    const assetResponse = await accountWorker.fetch(
      new Request("https://account.millered001.workers.dev/profile"),
      environment,
    );
    expect(assetResponse.status).toBe(200);
    expect(await assetResponse.text()).toBe("static");
    expect(assetFetch).toHaveBeenCalledOnce();
  });
});