import "./instrument";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { reportWebVitals } from "./reportWebVitals";

// En dev : log des requêtes Supabase en échec (URL = table ou RPC) pour diagnostic
if (import.meta.env.DEV && import.meta.env.VITE_SUPABASE_URL) {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, "");
  const realFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
    return realFetch.call(window, input, init).then((res) => {
      if (!res.ok && url.startsWith(supabaseUrl)) {
        const path = url.slice(supabaseUrl.length) || url;
        console.warn(
          "[Smart Fleet] Requête Supabase en échec:",
          res.status,
          path,
          "\n→ Table/RPC: voir l’URL (ex. /rest/v1/nom_table ou /rest/v1/rpc/nom_rpc).",
          "\n→ Vérifier les migrations: docs/verification-connexion-supabase.md § 3"
        );
      }
      return res;
    });
  };
}

createRoot(document.getElementById("root")!).render(<App />);
reportWebVitals();
