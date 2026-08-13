import { serve } from "@hono/node-server";
import { createServerApp } from "@/server/http/app";

export function startBffServer() {
  const app = createServerApp();
  const port = Number(process.env.BFF_PORT || process.env.PORT || 8787);
  const server = serve({ fetch: app.fetch, port }, (info) => {
    console.info(`[BFF] listening on http://127.0.0.1:${info.port}`);
  });
  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.warn(`[BFF] port ${port} already in use, keeping existing server.`);
      return;
    }
    throw error;
  });
}
