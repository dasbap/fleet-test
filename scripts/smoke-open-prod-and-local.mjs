/**
 * Smoke HTTP : site production e-samba.com + instance Vite locale (/, /auth, /login).
 * Usage : `node scripts/smoke-open-prod-and-local.mjs`
 *
 * Variables :
 *   SMOKE_LOCAL_PORT — port Vite fixe (évite le scan 8080–8095)
 *   SMOKE_LAN_HOST — hôte LAN (défaut 192.168.1.112)
 */
const PROD_URLS = [
  "https://www.e-samba.com/",
  "https://www.e-samba.com/auth",
];

async function fetchReport(url, timeoutMs = 25000) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(timeoutMs) });
    const ms = Date.now() - t0;
    const ct = res.headers.get("content-type") ?? "";
    const text = await res.text();
    const hasAuthHints =
      /type="password"|autocomplete="username"|Bon retour|Connexion|Créer un compte/i.test(text);
    return {
      ok: res.ok,
      status: res.status,
      ms,
      len: text.length,
      ct: ct.split(";")[0],
      hasAuthHints,
    };
  } catch (e) {
    return { ok: false, err: e instanceof Error ? e.message : String(e) };
  }
}

async function findVitePort() {
  const forced = process.env.SMOKE_LOCAL_PORT?.trim();
  if (forced) {
    const p = parseInt(forced, 10);
    if (!Number.isNaN(p)) {
      try {
        const r = await fetch(`http://127.0.0.1:${p}/`, { signal: AbortSignal.timeout(2000) });
        if (r.ok) return p;
      } catch {
        return null;
      }
    }
  }
  const ports = [];
  for (let port = 8080; port <= 8095; port++) ports.push(port);
  const hits = await Promise.all(
    ports.map(async (port) => {
      try {
        const r = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(600) });
        return r.ok ? port : null;
      } catch {
        return null;
      }
    })
  );
  for (let i = 0; i < ports.length; i++) {
    if (hits[i] !== null) return ports[i];
  }
  return null;
}

async function main() {
  console.log("=== Production (requêtes en parallèle) ===\n");
  const prodResults = await Promise.all(PROD_URLS.map((u) => fetchReport(u)));
  PROD_URLS.forEach((url, i) => {
    const r = prodResults[i];
    if (r.err) {
      console.log("ERR", url, r.err);
    } else {
      console.log(
        r.ok ? "OK" : "FAIL",
        r.status,
        `${r.ms}ms`,
        url,
        "|",
        r.ct,
        "| HTML ~",
        r.len,
        "car."
      );
    }
  });

  console.log("\n=== Local (scan parallèle des ports, puis requêtes groupées) ===\n");
  const port = await findVitePort();
  if (port === null) {
    console.log("Aucun serveur sur 127.0.0.1:8080–8095. Lancez npm run dev.");
    process.exit(1);
  }
  const base = `http://127.0.0.1:${port}`;
  const lanHost = process.env.SMOKE_LAN_HOST ?? "192.168.1.112";
  const lan = `http://${lanHost}:${port}`;
  console.log("Port :", port, "→", base, "\n");

  const localJobs = [];
  for (const path of ["/", "/auth", "/login"]) {
    for (const [label, origin] of [
      ["127.0.0.1", base],
      ["LAN", lan],
    ]) {
      const url = `${origin}${path === "/" ? "/" : path}`;
      localJobs.push(
        fetchReport(url, 20000).then((r) => ({ label, path, url, r }))
      );
    }
  }
  const localOut = await Promise.all(localJobs);
  for (const { label, path, url, r } of localOut) {
    if (r.err) {
      console.log("ERR", label, path, r.err);
    } else {
      const hint =
        path !== "/" && r.hasAuthHints ? " (indices formulaire auth dans le HTML)" : "";
      console.log(r.ok ? "OK" : "FAIL", label, path, r.status, `${r.ms}ms`, hint);
    }
  }

  console.log(
    "\nAstuce : `SMOKE_LOCAL_PORT=8087` pour cibler une instance précise ; smoke multi-navigateurs : `npm run smoke:dev-local:all` (serveur Vite déjà lancé)."
  );
}

void main();
