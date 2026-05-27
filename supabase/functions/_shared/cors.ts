const DEFAULT_ALLOWED_ORIGINS = [
  "https://www.e-samba.com",
  "https://e-samba.com",
  "https://app.e-samba.com",
  "capacitor://localhost",
  "http://localhost:5173",
  "https://localhost",
];

function getAllowedOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS")?.trim();
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function buildCorsHeaders(
  req: Request,
  options?: { allowedHeaders?: string; allowedMethods?: string },
): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = req.headers.get("origin") ?? "";
  const resolvedOrigin = allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : allowedOrigins[0] ?? "https://www.e-samba.com";

  return {
    "Access-Control-Allow-Origin": resolvedOrigin,
    "Access-Control-Allow-Methods": options?.allowedMethods ?? "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      options?.allowedHeaders ?? "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}
