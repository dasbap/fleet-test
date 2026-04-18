/**
 * Affiche les URL à autoriser côté Supabase (Dashboard → Authentication → URL Configuration)
 * pour l’app web + WebView Capacitor (auth email, recovery, PKCE/OAuth si activés plus tard).
 *
 * Ne se connecte pas à Supabase : sortie console pour revue humaine / checklist CI.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Aligné sur capacitor.config.ts */
const APP_ID = "com.esamba.flotte";
const ANDROID_SCHEME = "https";

function readEnvExampleAppUrl() {
  try {
    const raw = readFileSync(join(root, ".env.example"), "utf8");
    const m = raw.match(/#\s*VITE_APP_URL=(\S+)/);
    return m ? m[1].trim() : "https://www.e-samba.com";
  } catch {
    return "https://www.e-samba.com";
  }
}

const siteUrl = readEnvExampleAppUrl();

console.info(`
=== Redirections Supabase — checklist (revue manuelle) ===

1) Site URL (exemple projet) : ${siteUrl}
   — À aligner avec votre déploiement réel (production / staging).

2) Additional Redirect URLs — inclure au minimum :
   — ${siteUrl.replace(/\/$/, "")}/**
   — https://localhost/**     (WebView Android Capacitor, androidScheme: ${ANDROID_SCHEME})
   — capacitor://${APP_ID}/**   (selon version Capacitor / plateforme ; vérifier l’origine réelle dans les logs WebView si le flux auth échoue)
   — ${APP_ID}://**             (custom scheme iOS / Android si utilisé pour callbacks OAuth)

3) Deep links métier (esamba://) : documentés dans docs/deep-links-esamba.md — distincts des callbacks Supabase Auth.
   Si vous ajoutez OAuth/magic link natif : enregistrer l’URL exacte renvoyée par Supabase après le provider.

4) Code actuel :
   — signUp utilise emailRedirectTo = window.location.origin + "/" (auth-actions.ts).
   — En WebView, l’origine doit figurer dans la liste ci-dessus (souvent https://localhost).

5) Vérification terrain : après connexion / reset mot de passe, confirmer que la session
   est bien détectée (detectSessionInUrl: true dans integrations/supabase/client.ts).

Réf. : https://supabase.com/docs/guides/auth/redirect-urls
`);
