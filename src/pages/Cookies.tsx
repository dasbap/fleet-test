import { Link } from "react-router-dom";
import { Zap, Cookie } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

interface SectionProps {
  titre: string;
  children: React.ReactNode;
}

function Section({ titre, children }: SectionProps) {
  return (
    <div className="mb-10">
      <h2 className="font-heading text-xl font-bold mb-3 text-foreground">{titre}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

const TYPES_COOKIES = [
  {
    nom: "Cookies essentiels",
    obligatoire: true,
    description:
      "Indispensables au fonctionnement de la plateforme. Ils maintiennent votre session authentifiée, préservent vos préférences de thème (clair/sombre) et assurent la sécurité des échanges. Ces cookies ne peuvent pas être désactivés.",
    exemples: ["sb-session (Supabase Auth)", "theme-preference", "csrf-token"],
  },
  {
    nom: "Cookies de performance",
    obligatoire: false,
    description:
      "Collectent des données anonymisées sur la navigation au sein du dashboard (temps de chargement des pages, erreurs JS). Utilisés pour améliorer la stabilité de l'application. Aucune donnée personnellement identifiable n'est collectée.",
    exemples: ["_posthog (PostHog Analytics)", "sentry-session"],
  },
  {
    nom: "Cookies fonctionnels",
    obligatoire: false,
    description:
      "Mémorisent vos préférences d'interface : langue d'affichage, colonnes visibles dans les tableaux, filtres sauvegardés. Améliore l'expérience sans collecter de données personnelles.",
    exemples: ["i18n-lang", "table-prefs", "sidebar-collapsed"],
  },
];

const MISE_A_JOUR = "11 mai 2026";

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-background via-background to-primary/[0.06] border-b border-border py-16">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5">
              <Cookie className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-heading text-4xl font-bold mb-3">
              Politique de cookies
            </h1>
            <p className="text-muted-foreground">
              Dernière mise à jour : {MISE_A_JOUR}
            </p>
          </div>
        </section>

        {/* Contenu */}
        <article className="container mx-auto px-4 py-16 max-w-3xl">
          <Section titre="Qu'est-ce qu'un cookie ?">
            <p>
              Un cookie est un petit fichier texte déposé sur votre appareil
              lors de votre visite sur E-Samba. Il permet à l'application de
              mémoriser des informations entre vos sessions pour vous offrir une
              expérience cohérente et sécurisée.
            </p>
          </Section>

          <Section titre="Les cookies que nous utilisons">
            <div className="space-y-6 not-prose">
              {TYPES_COOKIES.map((type) => (
                <div
                  key={type.nom}
                  className="bg-card border border-border rounded-xl p-5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-foreground text-sm">
                      {type.nom}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        type.obligatoire
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {type.obligatoire ? "Obligatoire" : "Optionnel"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {type.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {type.exemples.map((ex) => (
                      <code
                        key={ex}
                        className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground"
                      >
                        {ex}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section titre="Durée de conservation">
            <p>
              Les cookies de session sont supprimés à la fermeture du
              navigateur. Les cookies persistants (préférences, analytics) sont
              conservés entre 7 jours et 12 mois selon leur finalité. La durée
              exacte est précisée dans les en-têtes de chaque cookie.
            </p>
          </Section>

          <Section titre="Comment gérer vos cookies ?">
            <p>
              Vous pouvez à tout moment contrôler les cookies via les
              paramètres de votre navigateur. La désactivation des cookies
              optionnels n'affecte pas l'accès à votre dashboard E-Samba.
              En revanche, la désactivation des cookies essentiels empêchera
              la connexion à votre compte.
            </p>
            <p>
              Navigateurs supportés :{" "}
              <a
                href="https://support.google.com/chrome/answer/95647"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Chrome
              </a>
              {", "}
              <a
                href="https://support.mozilla.org/fr/kb/protection-renforcee-contre-pistage-firefox"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Firefox
              </a>
              {", "}
              <a
                href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Safari
              </a>
              .
            </p>
          </Section>

          <Section titre="Cookies tiers">
            <p>
              E-Samba peut faire appel à des services tiers (PostHog pour
              l'analytics, Sentry pour la détection d'erreurs). Ces
              fournisseurs déposent leurs propres cookies soumis à leurs
              politiques de confidentialité respectives. Aucun cookie
              publicitaire ou de pistage inter-sites n'est utilisé.
            </p>
          </Section>

          <Section titre="Contact">
            <p>
              Pour toute question relative à l'usage des cookies sur E-Samba,
              contactez-nous à{" "}
              <a
                href="mailto:contact@e-samba.com"
                className="text-primary hover:underline"
              >
                contact@e-samba.com
              </a>{" "}
              ou appelez le{" "}
              <a
                href="tel:+237641341857"
                className="text-primary hover:underline"
              >
                +237 6 41 34 18 57
              </a>
              .
            </p>
          </Section>
        </article>

        {/* Lien retour */}
        <div className="container mx-auto px-4 pb-16 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Zap className="w-4 h-4" />
            Retour à l'accueil
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
