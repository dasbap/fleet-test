import type { User } from "@supabase/supabase-js";
import type { AuthUser } from "@/types/auth";

const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV === true;

export const devLog = (...args: unknown[]): void => {
  if (isDev) console.log(...args);
};

export const devWarn = (...args: unknown[]): void => {
  if (isDev) console.warn(...args);
};

export function mapSupabaseUserToAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? undefined,
    phone: user.phone ?? undefined,
    created_at: user.created_at,
    user_metadata: user.user_metadata as Record<string, unknown>,
    app_metadata: user.app_metadata as Record<string, unknown>,
  };
}

/** Évite un spinner infini si Supabase Auth ne répond pas (réseau, VPN, session corrompue). */
export function withPromiseTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label}_TIMEOUT`));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}
