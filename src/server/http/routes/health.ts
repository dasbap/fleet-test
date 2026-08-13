import type { Hono } from "hono";
import { getBackendUrl } from "../../env.js";

export function registerHealthRoutes(app: Hono) {
  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "smart-fleet-bff",
      backendUrl: getBackendUrl(),
    }),
  );
}
