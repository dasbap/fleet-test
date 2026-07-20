import type { Context } from "hono";
import { serializeServerError } from "@/lib/supabase-runtime-errors";

export function jsonInternalServerError(c: Context, error: unknown) {
  console.error("[BFF] request error:", error);
  const response = serializeServerError(error);
  return c.json(response.body, response.statusCode);
}
