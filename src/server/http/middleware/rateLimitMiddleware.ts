/**
 * Rate limiting in-process (mémoire Node).
 *
 * Stratégie : bucket par clé (IP ou token), fenêtre glissante.
 * Pour un déploiement multi-instance, remplacer par Redis / Upstash.
 *
 * Usage :
 *   app.use("/billing/notch/initiate", rateLimit({ maxRequests: 5, windowMs: 60_000 }));
 */

import type { MiddlewareHandler } from "hono";

interface RateLimitOptions {
  /** Nombre de requêtes maximum dans la fenêtre. Défaut : 10 */
  maxRequests?: number;
  /** Durée de la fenêtre en ms. Défaut : 60 000 (1 min) */
  windowMs?: number;
  /** Fonction pour dériver la clé d'identification. Défaut : IP */
  keyFn?: (c: Parameters<MiddlewareHandler>[0]) => string;
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

// Stockage en mémoire (single-instance)
const store = new Map<string, BucketEntry>();

// Nettoyage périodique pour éviter la fuite mémoire (toutes les 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 5 * 60_000).unref?.();

export function rateLimit(options: RateLimitOptions = {}): MiddlewareHandler {
  const maxRequests = options.maxRequests ?? 10;
  const windowMs = options.windowMs ?? 60_000;
  const keyFn = options.keyFn ?? ((c) => {
    // X-Forwarded-For (reverse proxy) → IP directe en fallback
    const forwarded = c.req.header("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return "unknown";
  });

  return async (c, next) => {
    const key = `rl:${c.req.path}:${keyFn(c)}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count += 1;

    c.res.headers.set("X-RateLimit-Limit", String(maxRequests));
    c.res.headers.set("X-RateLimit-Remaining", String(Math.max(0, maxRequests - entry.count)));
    c.res.headers.set("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > maxRequests) {
      return c.json(
        { error: "Trop de requêtes — réessayez dans quelques instants." },
        429,
      );
    }

    await next();
  };
}
