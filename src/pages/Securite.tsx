import { Link } from "react-router-dom";
import { Zap, Shield, Lock, Server, Eye, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { DEPARTMENT_EMAILS, buildMailtoHref } from "@/config/navigation";

const PILIERS = [
  {
    icon: Lock,
    titre: "Chiffrement de bout en bout",
    description:
      "Toutes les communications entre votre navigateur et nos serveurs sont chiffrées via TLS 1.3. Les données au repos sont chiffrées avec AES-256 dans notre infrastructure Supabase hébergée en Europe.",
  },
  {
    icon: Shield,
    titre: "Authentification robuste",
    description:
      "E-Samba utilise Supabase Auth avec des tokens JWT à durée limitée. L'application mobile supporte l'authentification biométrique (Face ID / empreinte). Aucun mot de passe n'est stocké en clair.",
  },
  {
    icon: Server,
    titre: "Isolation multi-tenant (RLS)",
    description:
      "Chaque flotte est isolée grâce aux Row Level Security Policies de PostgreSQL. Un utilisateur ne peut accéder qu'aux données de sa flotte — même au niveau base de données.",
  },
  {
    icon: Eye,
    titre: "Surveillance et audit",
    description:
      "Toutes les actions sensibles (connexion, modifications de données, invitations) sont journalisées. Nos systèmes de monitoring détectent les anomalies en temps réel 24h/24.",
  },
  {
    icon: RefreshCw,
    titre: "Sauvegardes automatiques",
    description:
      "Vos données sont sauvegardées automatiquement toutes les 24h avec une rétention de 7 jours. Les sauvegardes sont stockées dans une région distincte pour garantir la continuité.",
  },
  {
    icon: AlertTriangle,
    titre: "Gestion des incidents",
    description:
      "En cas d'incident de sécurité, notre équipe notifie les clients concernés sous 72h conformément aux exigences RGPD. Un plan de réponse aux incidents est activé immédiatement.",
  },
];

const CERTIFICATIONS = [
  "Hébergement sur infrastructure Supabase (SOC 2 Type II)",
  "Déploiement Vercel Edge Network (conformité GDPR)",
  "Politique de divulgation responsable (Responsible Disclosure)",
  "Revue de code sécurité intégrée au processus de développement",
];

export default function SecuritePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-background via-background to-primary/[0.06] border-b border-border py-20">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
              Sécurité E-Samba
            </h1>
            <p className="text-lg text-muted-foreground">
              La protection de vos données de flotte est notre priorité absolue.
              Voici comment nous sécurisons votre infrastructure opérationnelle.
            </p>
          </div>
        </section>

        {/* Piliers de sécurité */}
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="font-heading text-2xl font-bold mb-12 text-center">
              Nos mesures de sécurité
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {PILIERS.map((pilier) => (
                <div
                  key={pilier.titre}
                  className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-md transition-all duration-200"
                >
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 mb-4">
                    <pilier.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold text-base mb-2">
                    {pilier.titre}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {pilier.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Certifications & conformité */}
        <section className="py-16 bg-muted/30 border-y border-border">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="font-heading text-2xl font-bold mb-8 text-center">
              Conformité et standards
            </h2>
            <ul className="space-y-4">
              {CERTIFICATIONS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Signaler une vulnérabilité */}
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <h2 className="font-heading text-2xl font-bold mb-3">
              Signaler une vulnérabilité
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Vous avez découvert une faille de sécurité dans E-Samba ? Nous
              pratiquons la divulgation responsable. Contactez notre équipe
              sécurité directement — nous nous engageons à répondre sous 48h.
            </p>
            <a
              href={buildMailtoHref(DEPARTMENT_EMAILS.security)}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Shield className="w-4 h-4" />
              {DEPARTMENT_EMAILS.security}
            </a>
          </div>
        </section>

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
