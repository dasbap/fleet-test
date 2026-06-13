import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

const AUTH_STORAGE_KEY = "sfa_auth_token";

/**
 * Établit une session Supabase réelle via l'API Auth, puis l'injecte dans le localStorage
 * du navigateur (clé alignée sur src/integrations/supabase/client.ts).
 */
export async function establishLiveSupabaseSession(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  const url = process.env.VITE_SUPABASE_URL?.trim();
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error("VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY requis pour l'E2E live.");
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(
      `Connexion Supabase échouée (${email}): ${error?.message ?? "session absente"}`,
    );
  }

  const sessionPayload = JSON.stringify(data.session);

  await page.goto("/");
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: AUTH_STORAGE_KEY, value: sessionPayload },
  );
}

/** Tente la connexion via le formulaire /auth (parcours utilisateur). */
export async function loginViaAuthForm(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/auth");
  await page.getByLabel("Email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}
