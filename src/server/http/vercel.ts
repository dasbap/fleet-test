import { Hono } from "hono";
import { createServerApp } from "./app.js";

export function createVercelApiApp() {
  const app = new Hono();
  const bff = createServerApp();

  app.all("*", (c) => bff.fetch(c.req.raw));

  return app;
}
