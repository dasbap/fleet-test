import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

type ServiceStatus = "operational" | "degraded" | "outage";

interface Service {
  nom: string;
  statut: ServiceStatus;
  region?: string;
}

const SERVICES: Service[] = [
  { nom: "Dashboard Web", statut: "operational" },
  { nom: "API REST", statut: "operational" },
  { nom: "Application mobile", statut: "operational" },
  { nom: "Base de données (Supabase EU)", statut: "operational", region: "eu-central-1" },
  { nom: "Authentification", statut: "operational" },
  { nom: "Suivi GPS temps réel", statut: "operational" },
  { nom: "Notifications push (FCM / APNs)", statut: "operational" },
  { nom: "Rapports automatiques", statut: "operational" },
  { nom: "Webhooks & API tierce", statut: "operational" },
];

const STATUS_CONFIG: Record<ServiceStatus, { label: string; icon: typeof CheckCircle2; className: string; dot: string }> = {
  operational: {
    label: "Opérationnel",
    icon: CheckCircle2,
    className: "text-emerald-500 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  degraded: {
    label: "Dégradé",
    icon: AlertTriangle,
    className: "text-amber-500 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  outage: {
    label: "Interruption",
    icon: XCircle,
    className: "text-red-500 dark:text-red-400",
    dot: "bg-red-500",
  },
};

const allOperational = SERVICES.every((s) => s.statut === "operational");

export default function StatusPage() {
  const maintenant = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Statut global */}
        <section
          className={`pt-28 pb-12 border-b border-border ${
            allOperational
              ? "bg-gradient-to-br from-background via-background to-emerald-500/[0.06]"
              : "bg-gradient-to-br from-background via-background to-amber-500/[0.06]"
          }`}
        >
          <div className="container mx-auto px-4 max-w-3xl text-center">
            {allOperational ? (
              <>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 mb-4">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                </div>
                <h1 className="font-heading text-3xl font-bold mb-2 text-emerald-500 dark:text-emerald-400">
                  Tous les systèmes sont opérationnels
                </h1>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 mb-4">
                  <AlertTriangle className="w-7 h-7 text-amber-500" />
                </div>
                <h1 className="font-heading text-3xl font-bold mb-2">
                  Perturbations en cours
                </h1>
              </>
            )}
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-3">
              <RefreshCw className="w-3 h-3" />
              Mis à jour le {maintenant}
            </p>
          </div>
        </section>

        {/* Tableau des services */}
        <section className="py-14">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="font-heading text-xl font-bold mb-6">État des services</h2>
            <div className="border border-border rounded-2xl overflow-hidden">
              {SERVICES.map((service, i) => {
                const cfg = STATUS_CONFIG[service.statut];
                const Icon = cfg.icon;
                return (
                  <div
                    key={service.nom}
                    className={`flex items-center justify-between px-5 py-4 ${
                      i < SERVICES.length - 1 ? "border-b border-border" : ""
                    } hover:bg-muted/20 transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{service.nom}</p>
                        {service.region && (
                          <p className="text-xs text-muted-foreground/60 font-mono">
                            {service.region}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${cfg.className}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Historique */}
        <section className="py-10 bg-muted/30 border-y border-border">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="font-heading text-xl font-bold mb-4">
              Historique des incidents (30 derniers jours)
            </h2>
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucun incident signalé sur les 30 derniers jours.
              </p>
            </div>
          </div>
        </section>

        {/* Abonnement aux alertes */}
        <section className="py-14 text-center">
          <div className="container mx-auto px-4 max-w-md">
            <h2 className="font-heading font-semibold text-lg mb-2">
              Recevoir les alertes d'incident
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Inscrivez-vous pour être notifié par e-mail lors de toute
              interruption ou dégradation de service.
            </p>
            <a
              href="mailto:status@e-samba.com?subject=Abonnement alertes statut"
              className="inline-flex items-center gap-2 border border-border rounded-xl px-5 py-2.5 text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors"
            >
              S'abonner aux alertes
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
