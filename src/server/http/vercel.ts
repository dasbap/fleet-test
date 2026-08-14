import { Hono } from "hono";
import { createServerApp } from "./app.js";

function withStrippedApiPrefix(input: Request): Request {
  const url = new URL(input.url);
  url.pathname = url.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  return new Request(url, input);
}

export function createVercelApiApp() {
  const app = new Hono();
  const bff = createServerApp();

  app.all("/api/*", async (c) => {
    const strippedResponse = await bff.fetch(withStrippedApiPrefix(c.req.raw));
    if (strippedResponse.status !== 404) {
      return strippedResponse;
    }
    return bff.fetch(c.req.raw);
  });

  app.all("*", (c) => bff.fetch(c.req.raw));

  return app;
}
