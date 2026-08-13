import { Code2, Key, Lock, Zap } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { buildMailtoHref, DEPARTMENT_EMAILS } from "@/config/navigation";

const ENDPOINTS = [
  { methode: "GET", path: "/v1/fleets/{fleetId}/vehicles", description: "Liste des véhicules de la flotte" },
  { methode: "POST", path: "/v1/fleets/{fleetId}/vehicles", description: "Ajouter un véhicule" },
  { methode: "GET", path: "/v1/fleets/{fleetId}/drivers", description: "Liste des conducteurs" },
  { methode: "GET", path: "/v1/fleets/{fleetId}/incidents", description: "Liste des incidents déclarés" },
  { methode: "GET", path: "/v1/fleets/{fleetId}/maintenance", description: "Travaux de maintenance" },
  { methode: "POST", path: "/v1/fleets/{fleetId}/alerts", description: "Créer une alerte personnalisée" },
  { methode: "GET", path: "/v1/fleets/{fleetId}/reports/summary", description: "Résumé KPI de la flotte" },
  { methode: "GET", path: "/v1/vehicles/{vehicleId}/location", description: "Dernière position GPS du véhicule" },
];

const METHODE_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  POST: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  PUT: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  DELETE: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="bg-gradient-to-br from-background via-background to-primary/[0.06] border-b border-border pt-28 pb-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              <Code2 className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-heading text-4xl font-bold mb-3">API E-Samba</h1>
            <p className="text-muted-foreground max-w-xl">
              API REST JSON. Intégrez les données de votre flotte dans vos
              outils ERP, comptabilité ou GPS tiers.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-full font-medium">
              <Zap className="w-3.5 h-3.5" />
              API en accès anticipé — disponible sur demande (plans Pro et Entreprise)
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-16 max-w-4xl space-y-10">
          {/* Authentification */}
          <section>
            <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" /> Authentification
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Toutes les requêtes API doivent inclure votre clé API dans
              l'en-tête{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs">
                Authorization
              </code>
              . Générez votre clé depuis le dashboard :{" "}
              <strong className="text-foreground">Paramètres → API</strong>.
            </p>
            <div className="bg-muted/60 border border-border rounded-xl p-4 font-mono text-xs overflow-x-auto">
              <span className="text-muted-foreground">curl </span>
              <span className="text-primary">-H </span>
              <span className="text-amber-500">"Authorization: Bearer ESA_sk_live_xxxx"</span>
              {" \\"}
              <br />
              {"  "}
              <span className="text-primary">-H </span>
              <span className="text-amber-500">"Content-Type: application/json"</span>
              {" \\"}
              <br />
              {"  "}
              <span className="text-muted-foreground">https://www.e-samba.com/api/v1/fleets/</span>
              <span className="text-primary">{"{"}</span>
              fleetId
              <span className="text-primary">{"}"}</span>
              /vehicles
            </div>
          </section>

          {/* URL de base */}
          <section>
            <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> URL de base
            </h2>
            <div className="bg-muted/60 border border-border rounded-xl p-4 font-mono text-sm">
              https://www.e-samba.com/api/v1
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Toutes les requêtes sont HTTPS. Les requêtes HTTP sont redirigées
              automatiquement. Limite de débit : 100 req/min (Pro), illimité (Entreprise).
            </p>
          </section>

          {/* Endpoints */}
          <section>
            <h2 className="font-heading text-xl font-bold mb-4">Endpoints disponibles</h2>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-16">Méthode</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground">Endpoint</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground hidden md:table-cell">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ENDPOINTS.map(({ methode, path, description }) => (
                    <tr key={path} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${METHODE_COLORS[methode]}`}>
                          {methode}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{path}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Accès */}
          <section className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
            <h2 className="font-heading font-semibold mb-2">Demander l'accès API</h2>
            <p className="text-sm text-muted-foreground mb-4">
              L'API E-Samba est disponible sur les plans Pro et Entreprise.
              Contactez-nous pour obtenir votre clé de test sandbox.
            </p>
            <a
              href={buildMailtoHref(DEPARTMENT_EMAILS.api, {
                subject: "Demande acces API E-Samba",
              })}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors text-sm"
            >
              <Code2 className="w-4 h-4" />
              Demander l'accès
            </a>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
