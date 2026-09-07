import { Hono } from "hono";
import { createServerApp } from "./app.js";

const API_PREFIXED_ROUTES = [
  "/api/admin/",
  "/api/demo/",
  "/api/auth/",
  "/api/terrain/",
  "/api/payments/",
];

const API_PREFIXED_EXACT_ROUTES = new Set([
  "/api/billing/snapshot",
  "/api/webhooks/payments/inbound",
]);

function shouldPreserveApiPrefix(pathname: string): boolean {
  if (API_PREFIXED_EXACT_ROUTES.has(pathname)) return true;
  return API_PREFIXED_ROUTES.some((prefix) => pathname.startsWith(prefix));
}

export function createVercelApiApp() {
  const app = new Hono();
  const bff = createServerApp();

  app.all("*", async (c) => {
    const request = c.req.raw;
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/") && !shouldPreserveApiPrefix(url.pathname)) {
      url.pathname = url.pathname.slice(4) || "/";
      return bff.fetch(new Request(url, request));
    }

    return bff.fetch(request);
  });

  return app;
}
