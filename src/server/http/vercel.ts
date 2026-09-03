import { Hono } from "hono";
import { createServerApp } from "./app.js";

export function createVercelApiApp() {
  const app = new Hono();
  const bff = createServerApp();

  app.all("*", async (c) => {
    const request = c.req.raw;
    const url = new URL(request.url);

    let response = await bff.fetch(request);
    if (response.status !== 404 || !url.pathname.startsWith("/api/")) {
      return response;
    }

    url.pathname = url.pathname.slice(4) || "/";
    response = await bff.fetch(new Request(url, request));
    return response;
  });

  return app;
}
