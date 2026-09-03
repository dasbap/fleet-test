const DEFAULT_SUPABASE_FETCH_TIMEOUT_MS = 4_000;

export class SupabaseUpstreamTimeoutError extends Error {
  readonly statusCode = 504;

  constructor(timeoutMs: number) {
    super(`Supabase upstream request timed out after ${timeoutMs}ms`);
    this.name = "SupabaseUpstreamTimeoutError";
  }
}

export async function fetchWithSupabaseTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const timeoutMs = DEFAULT_SUPABASE_FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const upstreamSignal = init?.signal;
  const abortFromUpstream = () => controller.abort();
  if (upstreamSignal) {
    if (upstreamSignal.aborted) controller.abort();
    else upstreamSignal.addEventListener("abort", abortFromUpstream, { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted && !upstreamSignal?.aborted) {
      throw new SupabaseUpstreamTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    upstreamSignal?.removeEventListener("abort", abortFromUpstream);
  }
}
