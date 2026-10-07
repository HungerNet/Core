interface ApiProxyEnvironment {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  HUNGERNET_API_ORIGIN?: string;
}

const DEFAULT_API_ORIGIN = "https://api.hacklets.dev";

export default {
  async fetch(request: Request, env: ApiProxyEnvironment): Promise<Response> {
    const incomingUrl = new URL(request.url);
    if (
      incomingUrl.pathname !== "/api/v1" &&
      !incomingUrl.pathname.startsWith("/api/v1/")
    ) {
      return env.ASSETS.fetch(request);
    }

    const upstreamUrl = new URL(
      `${incomingUrl.pathname}${incomingUrl.search}`,
      env.HUNGERNET_API_ORIGIN ?? DEFAULT_API_ORIGIN,
    );
    const headers = new Headers(request.headers);
    headers.set("Origin", incomingUrl.origin);
    headers.delete("Host");
    headers.delete("Content-Length");

    const init: RequestInit = {
      method: request.method,
      headers,
      redirect: "manual",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    return fetch(new Request(upstreamUrl, init));
  },
};
