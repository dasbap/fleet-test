/**
 * HelpCenterCard — Carte d'entrée vers le Centre d'aide.
 * Variante compacte pour les paramètres / sidebar.
 * Variante complète pour les pages de support.
 *
 * Props :
 *   variant="compact"  → petite carte avec lien et canaux support
 *   variant="full"     → carte complète avec sections et recherche rapide
 */
import { Link } from "react-router-dom";
import {
  HelpCircle,
  MessageCircle,
  Mail,
  Zap,
  BookOpen,
  Shield,
  FileText,
  ChevronRight,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACCOUNT_EXTERNAL_LINKS } from "@/features/account/config/accountLinks";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { cn } from "@/lib/utils";
import { useState } from "react";

import { buildWhatsAppUrl, SOCIAL } from "@/config/navigation";

interface HelpCenterCardProps {
  variant?: "compact" | "full";
  className?: string;
}

/** Sections rapides affichées dans la variante full */
const SECTIONS = [
  {
    icon: <Zap className="h-4 w-4 text-primary" aria-hidden />,
    label: "Démarrage rapide",
    description: "Créer votre flotte en moins de 8 min",
    to: ROUTE_PATHS.helpQuickstart,
  },
  {
    icon: <BookOpen className="h-4 w-4 text-primary" aria-hidden />,
    label: "Guides et tutoriels",
    description: "FAQ, DVIR, clôtures, conducteurs",
    to: ROUTE_PATHS.help,
  },
  {
    icon: <Shield className="h-4 w-4 text-primary" aria-hidden />,
    label: "Politique de confidentialité",
    description: "RGPD, GPS, paiements",
    to: ACCOUNT_EXTERNAL_LINKS.privacyPolicy,
  },
  {
    icon: <FileText className="h-4 w-4 text-primary" aria-hidden />,
    label: "Conditions d'utilisation",
    description: "Abonnements, licences, responsabilités",
    to: ACCOUNT_EXTERNAL_LINKS.termsOfService,
  },
] as const;

export function HelpCenterCard({
  variant = "compact",
  className,
}: HelpCenterCardProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const whatsappHref = buildWhatsAppUrl(SOCIAL.whatsappSupportMessage);

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-card p-4 space-y-3",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary shrink-0" aria-hidden />
          <p className="text-sm font-semibold text-foreground">
            Centre d&apos;aide
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Guides, FAQ et support — disponibles hors ligne.
        </p>
        <div className="flex flex-col gap-2">
          <Button asChild size="sm" className="w-full">
            <Link to={ACCOUNT_EXTERNAL_LINKS.helpCenter}>
              Ouvrir le centre d&apos;aide
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Support WhatsApp"
              >
                <MessageCircle className="h-4 w-4 mr-1 text-green-500" aria-hidden />
                WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="flex-1">
              <a href="mailto:support@e-samba.com" aria-label="Support Email">
                <Mail className="h-4 w-4 mr-1 text-blue-500" aria-hidden />
                Email
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // variante full
  return (
    <div
      className={cn("rounded-xl border border-border bg-card space-y-0 divide-y divide-border overflow-hidden", className)}
    >
      {/* En-tête */}
      <div className="p-4 flex items-center gap-3 bg-primary/5">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <HelpCircle className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Centre d&apos;aide E-Samba</p>
          <p className="text-xs text-muted-foreground">Guides, FAQ, tutoriels et support</p>
        </div>
      </div>

      {/* Recherche rapide */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans l'aide…"
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
            aria-label="Recherche aide"
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                window.location.href = `${ROUTE_PATHS.helpSearch}?q=${encodeURIComponent(searchQuery.trim())}`;
              }
            }}
          />
        </div>
      </div>

      {/* Sections */}
      <nav aria-label="Sections aide">
        {SECTIONS.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
          >
            <div className="shrink-0">{s.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground truncate">{s.description}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" aria-hidden />
          </Link>
        ))}
      </nav>

      {/* Canaux support */}
      <div className="p-3 flex gap-2">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium py-2 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          aria-label="Contacter le support via WhatsApp"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          WhatsApp
        </a>
        <a
          href="mailto:support@e-samba.com"
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border text-muted-foreground text-xs font-medium py-2 hover:bg-muted/50 transition-colors"
          aria-label="Contacter le support par email"
        >
          <Mail className="h-3.5 w-3.5" aria-hidden />
          support@e-samba.com
        </a>
      </div>
    </div>
  );
}
