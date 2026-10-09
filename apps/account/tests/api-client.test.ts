import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@hungernet/api-client";

class UploadXMLHttpRequest {
  static lastRequest: UploadXMLHttpRequest | undefined;

  readonly upload = {
    addEventListener: (_type: string, listener: (event: ProgressEvent) => void) => {
      this.progressListener = listener;
    },
  };
  readonly requestHeaders = new Map<string, string>();
  readonly eventListeners = new Map<string, () => void>();
  progressListener: ((event: ProgressEvent) => void) | undefined;
  method = "";
  url = "";
  sentBody: XMLHttpRequestBodyInit | null = null;
  withCredentials = false;
  status = 200;
  statusText = "OK";
  responseText = JSON.stringify({ avatar_url: "https://cdn.example.test/avatar.png" });

  constructor() {
    UploadXMLHttpRequest.lastRequest = this;
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.requestHeaders.set(name.toLowerCase(), value);
  }

  addEventListener(type: string, listener: () => void) {
    this.eventListeners.set(type, listener);
  }

  getAllResponseHeaders() {
    return "content-type: application/json\r\n";
  }

  send(body: XMLHttpRequestBodyInit | null) {
    this.sentBody = body;
    this.progressListener?.({
      lengthComputable: true,
      loaded: 2,
      total: 4,
    } as ProgressEvent);
    this.eventListeners.get("load")?.();
  }

  abort() {
    this.eventListeners.get("abort")?.();
  }
}

describe("API client upload progress", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    UploadXMLHttpRequest.lastRequest = undefined;
  });

  it("reports upload progress and preserves auth-protection headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ csrfToken: "csrf-test-token" }), {
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    vi.stubGlobal("XMLHttpRequest", UploadXMLHttpRequest);
    const client = createApiClient();
    const progress: number[] = [];
    const image = new Blob(["image"], { type: "image/png" });

    const result = await client.request<{ avatar_url: string }>("/users/me/avatar", {
      method: "POST",
      body: image,
      headers: { "Content-Type": image.type },
      onUploadProgress: (percent) => progress.push(percent),
    });

    expect(result.avatar_url).toBe("https://cdn.example.test/avatar.png");
    expect(progress).toEqual([50]);
    expect(UploadXMLHttpRequest.lastRequest?.method).toBe("POST");
    expect(UploadXMLHttpRequest.lastRequest?.sentBody).toBe(image);
    expect(UploadXMLHttpRequest.lastRequest?.requestHeaders.get("x-csrf-token"))
      .toBe("csrf-test-token");
    expect(UploadXMLHttpRequest.lastRequest?.withCredentials).toBe(true);
  });
});
