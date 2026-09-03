import { Hono } from "hono";
import { createServerApp } from "./app.js";

export function createVercelApiApp() {
  const app = new Hono();
  const bff = createServerApp();

  app.all("*", async (c) => {
    const request = c.req.raw;
    const url = new URL(request.url);
    const shouldRetryWithoutApiPrefix = url.pathname.startsWith("/api/");
    const primaryRequest = shouldRetryWithoutApiPrefix ? request.clone() : request;

    let response = await bff.fetch(primaryRequest);
    if (response.status !== 404 || !shouldRetryWithoutApiPrefix) {
      return response;
    }

    url.pathname = url.pathname.slice(4) || "/";
    response = await bff.fetch(new Request(url, request));
    return response;
  });

  return app;
}
