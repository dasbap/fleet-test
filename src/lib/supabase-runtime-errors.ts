export type SupabaseInfrastructurePublicCode =
  | "SUPABASE_SCHEMA_MISSING"
  | "SUPABASE_CONNECTION_FAILED"
  | "SUPABASE_UPSTREAM_TIMEOUT"
  | "SUPABASE_RUNTIME_ERROR";

type ErrorLike = {
  code?: string | number;
  message?: string;
  details?: string;
  hint?: string;
  cause?: unknown;
  status?: number;
  statusCode?: number;
};

const SCHEMA_ERROR_CODES = new Set(["PGRST200", "PGRST202", "PGRST204", "PGRST205", "42P01", "42703", "42883"]);

const CONNECTION_PATTERNS = [
  "failed to fetch",
  "fetch failed",
  "networkerror",
  "network error",
  "connection error",
  "enotfound",
  "econnrefused",
  "econnreset",
  "etimedout",
  "eai_again",
  "und_err_connect_timeout",
  "getaddrinfo",
];

const TIMEOUT_PATTERNS = [
  "supabaseupstreamtimeouterror",
  "supabase upstream request timed out",
];

const SCHEMA_PATTERNS = [
  "schema cache",
  "could not find the table",
  "could not find the function",
  "relationship not found",
  "no relationship found",
];

export class SupabaseInfrastructureError extends Error {
  readonly statusCode = 500;
  readonly publicCode: SupabaseInfrastructurePublicCode;
  readonly cause: unknown;

  constructor(publicCode: SupabaseInfrastructurePublicCode, context: string, cause: unknown) {
    super(`${context}: ${describePublicCode(publicCode)}`);
    this.name = "SupabaseInfrastructureError";
    this.publicCode = publicCode;
    this.cause = cause;
  }
}

function describePublicCode(publicCode: SupabaseInfrastructurePublicCode): string {
  if (publicCode === "SUPABASE_SCHEMA_MISSING") {
    return "required Supabase schema object is missing or not exposed";
  }
  if (publicCode === "SUPABASE_CONNECTION_FAILED") {
    return "Supabase connection failed";
  }
  if (publicCode === "SUPABASE_UPSTREAM_TIMEOUT") {
    return "Supabase upstream request timed out";
  }
  return "Supabase runtime error";
}

function isObject(value: unknown): value is ErrorLike {
  return typeof value === "object" && value !== null;
}

function getErrorCode(error: unknown): string {
  if (!isObject(error)) return "";
  return typeof error.code === "string" || typeof error.code === "number" ? String(error.code) : "";
}

function collectErrorText(error: unknown, seen = new Set<unknown>()): string {
  if (error == null || seen.has(error)) return "";
  seen.add(error);

  if (typeof error === "string") return error;
  if (typeof error === "number" || typeof error === "boolean") return String(error);

  if (error instanceof Error) {
    const anyError = error as ErrorLike;
    return [
      error.name,
      error.message,
      anyError.details,
      anyError.hint,
      collectErrorText(anyError.cause, seen),
    ]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .join(" ");
  }

  if (isObject(error)) {
    return [
      getErrorCode(error),
      error.message,
      error.details,
      error.hint,
      collectErrorText(error.cause, seen),
    ]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .join(" ");
  }

  return "";
}

export function isSupabaseSchemaError(error: unknown): boolean {
  const code = getErrorCode(error);
  if (SCHEMA_ERROR_CODES.has(code)) return true;

  const text = collectErrorText(error).toLowerCase();
  if (text.includes("does not exist") && (text.includes("relation ") || text.includes("column ") || text.includes("function "))) {
    return true;
  }
  return SCHEMA_PATTERNS.some((pattern) => text.includes(pattern));
}

export function isSupabaseTimeoutError(error: unknown): boolean {
  const text = collectErrorText(error).toLowerCase();
  return TIMEOUT_PATTERNS.some((pattern) => text.includes(pattern));
}

export function isSupabaseConnectionError(error: unknown): boolean {
  const text = collectErrorText(error).toLowerCase();
  return CONNECTION_PATTERNS.some((pattern) => text.includes(pattern));
}

export function toSupabaseInfrastructureError(error: unknown, context: string): SupabaseInfrastructureError {
  const publicCode = isSupabaseTimeoutError(error)
    ? "SUPABASE_UPSTREAM_TIMEOUT"
    : isSupabaseConnectionError(error)
      ? "SUPABASE_CONNECTION_FAILED"
      : isSupabaseSchemaError(error)
        ? "SUPABASE_SCHEMA_MISSING"
        : "SUPABASE_RUNTIME_ERROR";

  return new SupabaseInfrastructureError(publicCode, context, error);
}

export function throwIfSupabaseInfrastructureError(error: unknown, context: string): void {
  if (isSupabaseTimeoutError(error) || isSupabaseSchemaError(error) || isSupabaseConnectionError(error)) {
    throw toSupabaseInfrastructureError(error, context);
  }
}

export function serializeServerError(error: unknown): {
  statusCode: 500 | 504;
  body: { ok: false; error: string };
} {
  if (isSupabaseTimeoutError(error)) {
    return {
      statusCode: 504,
      body: { ok: false, error: "SUPABASE_UPSTREAM_TIMEOUT" },
    };
  }

  if (error instanceof SupabaseInfrastructureError) {
    return {
      statusCode: error.publicCode === "SUPABASE_UPSTREAM_TIMEOUT" ? 504 : 500,
      body: { ok: false, error: error.publicCode },
    };
  }

  if (isSupabaseSchemaError(error) || isSupabaseConnectionError(error)) {
    const infrastructureError = toSupabaseInfrastructureError(error, "server request");
    return {
      statusCode: 500,
      body: { ok: false, error: infrastructureError.publicCode },
    };
  }

  return {
    statusCode: 500,
    body: { ok: false, error: "INTERNAL_SERVER_ERROR" },
  };
}
