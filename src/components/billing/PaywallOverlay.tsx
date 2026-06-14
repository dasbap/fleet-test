/**
 * PaywallOverlay — enrobage flou + prompt upgrade.
 *
 * Usage :
 *   <PaywallOverlay
 *     access={pulseAccess}
 *     feature="Pulse+ (IA prédictive)"
 *   >
 *     <PulseWidget />
 *   </PaywallOverlay>
 *
 * Si access.allowed → rendu transparent du contenu.
 * Sinon → contenu flouté + carte upgrade centrée.
 */

import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { buildSupportMailto } from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { PlanAccessResult, PlanCode } from "@/lib/billing/planGuards";

const PLAN_LABELS: Record<PlanCode, string> = {
  free:       "Free",
  starter:    "Starter",
  pro:        "Pro",
  enterprise: "Organizer",
};

const PLAN_HREF: Record<PlanCode, string> = {
  free:       ROUTE_PATHS.pricing,
  starter:    ROUTE_PATHS.pricing,
  pro:        ROUTE_PATHS.pricing,
  enterprise: buildSupportMailto("Devis Organizer"),
};

interface PaywallOverlayProps {
  /** Résultat du guard (canUsePulse, canExportReports, etc.). */
  access: PlanAccessResult | undefined;
  /** Nom de la fonctionnalité bloquée — affiché dans la carte upgrade. */
  feature?: string;
  /** Contenu protégé. */
  children: React.ReactNode;
  className?: string;
  /** Si true, ne floute pas le contenu mais empile le paywall au-dessus. */
  overlay?: boolean;
}

export function PaywallOverlay({
  access,
  feature,
  children,
  className,
  overlay = true,
}: PaywallOverlayProps) {
  // Tant que le contexte charge, on laisse passer (évite le flash paywall)
  if (access === undefined || access.allowed) {
    return <>{children}</>;
  }

  const requiredPlan = access.requiredPlan ?? "starter";
  const planLabel    = PLAN_LABELS[requiredPlan];
  const href         = PLAN_HREF[requiredPlan];
  const isExternal   = href.startsWith("mailto:");

  return (
    <div className={cn("relative", className)}>
      {/* Contenu flouté en arrière-plan */}
      {overlay && (
        <div className="select-none" aria-hidden>
          <div className={cn("pointer-events-none", overlay && "blur-sm brightness-90 saturate-50")}>
            {children}
          </div>
        </div>
      )}

      {/* Carte paywall */}
      <div
        className={cn(
          "flex items-center justify-center",
          overlay
            ? "absolute inset-0 bg-background/60 backdrop-blur-[2px]"
            : "py-8",
        )}
      >
        <Card className="mx-4 max-w-sm shadow-lg">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>

            <div>
              {feature && (
                <p className="mb-1 font-semibold">{feature}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {access.upgradeMessage ?? `Cette fonctionnalité nécessite le plan ${planLabel} ou supérieur.`}
              </p>
            </div>

            {isExternal ? (
              <Button size="sm" asChild>
                <a href={href}>Demander un devis</a>
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link to={href}>Passer au plan {planLabel}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Variante inline (pas de contenu enfant) ──────────────────────────────

interface PaywallBannerProps {
  access: PlanAccessResult | undefined;
  feature?: string;
  className?: string;
}

/**
 * Bannière inline sans contenu enfant — utile pour les sections entières bloquées.
 */
export function PaywallBanner({ access, feature, className }: PaywallBannerProps) {
  if (!access || access.allowed) return null;

  const requiredPlan = access.requiredPlan ?? "starter";
  const planLabel    = PLAN_LABELS[requiredPlan];
  const href         = PLAN_HREF[requiredPlan];
  const isExternal   = href.startsWith("mailto:");

  return (
    <div className={cn("rounded-xl border bg-muted/30 p-4", className)}>
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {feature && <span className="font-medium text-foreground">{feature} · </span>}
            {access.upgradeMessage ?? `Disponible à partir du plan ${planLabel}.`}
          </p>
          {isExternal ? (
            <Button size="sm" variant="outline" className="shrink-0" asChild>
              <a href={href}>Demander un devis</a>
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="shrink-0" asChild>
              <Link to={href}>Voir les plans</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
