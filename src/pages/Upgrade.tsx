import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AlertTriangle, Check, Smartphone, Zap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { useAuth } from "@/hooks/useAuth";
import { useBilling } from "@/hooks/useBilling";
import {
  PUBLIC_BILLING_PERIOD_LABEL,
  PUBLIC_CURRENCY_LABEL,
  PUBLIC_PRICE_FREE_PER_VEHICLE_XAF,
  PUBLIC_PRICE_PRO_PER_VEHICLE_XAF,
  PUBLIC_PRICE_STARTER_PER_VEHICLE_XAF,
  formatPublicPriceXaf,
} from "@/lib/public-pricing";
import { cn } from "@/lib/utils";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { MoMoPaymentDialog } from "@/components/billing/MoMoPaymentDialog";

const SUPPORT_EMAIL = "support@e-samba.com";

type PlanKey = "free" | "starter" | "pro";

function buildRenewalMailto(plan: PlanKey, fleetLabel: string): string {
  const subjects: Record<PlanKey, string> = {
    free: "E-Samba — Passage à l'offre Gratuite",
    starter: "E-Samba — Renouvellement plan Starter",
    pro: "E-Samba — Renouvellement plan Pro",
  };
  const body = [
    "Bonjour,",
    "",
    `Je souhaite obtenir des informations concernant : ${subjects[plan].replace(/^E-Samba — /, "")}.`,
    fleetLabel ? `Flotte / contexte : ${fleetLabel}` : "",
    "",
    "Cordialement,",
  ]
    .filter(Boolean)
    .join("\n");

  const params = new URLSearchParams({
    subject: subjects[plan],
    body,
  });
  return `mailto:${SUPPORT_EMAIL}?${params.toString()}`;
}

const upgradePlans: Array<{
  key: PlanKey;
  name: string;
  description: string;
  price: string;
  priceXAF: number;
  popular: boolean;
  features: string[];
  cta: string;
}> = [
  {
    key: "free",
    name: "Gratuit",
    description: "Pour tester le pilotage sans engagement",
    price: formatPublicPriceXaf(PUBLIC_PRICE_FREE_PER_VEHICLE_XAF),
    priceXAF: PUBLIC_PRICE_FREE_PER_VEHICLE_XAF,
    popular: false,
    features: [
      "Jusqu'à 3 véhicules",
      "Samba-Fleet (cœur métier)",
      "Sans Samba-Cash ni assistance IA",
    ],
    cta: "Demander le gratuit",
  },
  {
    key: "starter",
    name: "Starter",
    description: "Pour les petites flottes qui démarrent",
    price: formatPublicPriceXaf(PUBLIC_PRICE_STARTER_PER_VEHICLE_XAF),
    priceXAF: PUBLIC_PRICE_STARTER_PER_VEHICLE_XAF,
    popular: false,
    features: [
      "Jusqu'à 5 véhicules",
      "1 rôle Gestionnaire",
      "Samba-Fleet et Samba-Cash essentiel",
      "Support par e-mail",
    ],
    cta: "Renouveler Starter",
  },
  {
    key: "pro",
    name: "Pro",
    description: "Pour les flottes en croissance",
    price: formatPublicPriceXaf(PUBLIC_PRICE_PRO_PER_VEHICLE_XAF),
    priceXAF: PUBLIC_PRICE_PRO_PER_VEHICLE_XAF,
    popular: true,
    features: [
      "Jusqu'à 25 véhicules",
      "Jusqu'à 3 rôles Gestionnaire",
      "Suite complète et scoring",
      "Alertes intelligentes",
      "Support prioritaire",
    ],
    cta: "Renouveler Pro",
  },
];

/**
 * Offres et renouvellement : affichage lorsque le plan payant est expiré (`lapsedPaid`)
 * ou accès direct à `/upgrade`.
 */
export default function Upgrade() {
  const merchantCodes = {
    orange: import.meta.env.VITE_ORANGE_MONEY_MERCHANT as string | undefined,
    mtn: import.meta.env.VITE_MTN_MOMO_MERCHANT as string | undefined,
  };
  const {
    user,
    orgId,
    activeTenantContext,
    isLoading: authLoading,
    isTenantOrgLoading,
  } = useAuth();
  const fleetId = activeTenantContext?.fleetId ?? null;
  const canQueryBilling = Boolean(orgId && fleetId);

  const { data: billing, isLoading: billingLoading } = useBilling(
    canQueryBilling ? orgId : null,
    canQueryBilling ? fleetId : null,
  );

  const [momoDialog, setMomoDialog] = useState<{
    planCode: string;
    planName: string;
    vehicleCount: number;
    amountXaf: number;
  } | null>(null);

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to={ROUTE_PATHS.auth} replace />;
  }

  if (isTenantOrgLoading) {
    return <PageLoader />;
  }

  if (!canQueryBilling) {
    return <Navigate to={ROUTE_PATHS.tenantBootstrap} replace />;
  }

  if (billingLoading) {
    return <PageLoader />;
  }

  const fleetLabel = [orgId, fleetId].filter(Boolean).join(" / ");

  return (
    <div className="bg-muted/30 min-h-screen py-10 md:py-16">
      <div className="container mx-auto max-w-6xl space-y-8 px-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-primary text-sm font-medium uppercase tracking-wider">
              E-Samba
            </p>
            <h1 className="font-heading mt-2 text-3xl font-bold md:text-4xl">
              Abonnement et offres
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm md:text-base">
              Choisissez une offre ou contactez le support pour renouveler votre abonnement.
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link to={ROUTE_PATHS.dashboard}>Retour au tableau de bord</Link>
          </Button>
        </div>

        {billing?.lapsedPaid && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Abonnement expiré</AlertTitle>
            <AlertDescription>
              Votre abonnement payant n’est plus actif. Renouvelez un plan ou contactez-nous
              pour adapter votre formule afin de retrouver l’accès complet aux fonctionnalités
              concernées.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {upgradePlans.map((plan) => (
            <div
              key={plan.key}
              className={cn(
                "relative rounded-2xl border bg-card p-8 transition-all duration-300",
                plan.popular
                  ? "border-primary shadow-glow scale-[1.02] md:scale-105"
                  : "border-border hover:border-primary/30",
              )}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-primary text-primary-foreground flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium">
                    <Zap className="h-4 w-4" />
                    <span>Populaire</span>
                  </div>
                </div>
              )}

              <div className="mb-8 text-center">
                <h2 className="font-heading mb-2 text-xl font-bold">{plan.name}</h2>
                <p className="text-muted-foreground mb-4 text-sm">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-heading text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-lg">{PUBLIC_CURRENCY_LABEL}</span>
                </div>
                <span className="text-muted-foreground text-sm">{PUBLIC_BILLING_PERIOD_LABEL}</span>
              </div>

              <ul className="mb-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <div className="bg-primary/10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                      <Check className="text-primary h-3 w-3" />
                    </div>
                    <span className="text-foreground/80 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-2">
                {plan.key !== "free" && (
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    onClick={() => {
                      const pricePerVehicle =
                        plan.key === "pro"
                          ? PUBLIC_PRICE_PRO_PER_VEHICLE_XAF
                          : PUBLIC_PRICE_STARTER_PER_VEHICLE_XAF;
                      const defaultVehicles = plan.key === "pro" ? 5 : 3;
                      setMomoDialog({
                        planCode: plan.key,
                        planName: plan.name,
                        vehicleCount: defaultVehicles,
                        amountXaf: pricePerVehicle * defaultVehicles,
                      });
                    }}
                  >
                    <Smartphone className="h-4 w-4 mr-1.5" />
                    Payer Mobile Money
                  </Button>
                )}
                <Button
                  className="w-full"
                  variant={plan.key !== "free" ? "outline" : plan.popular ? "default" : "outline"}
                  asChild
                >
                  <a href={buildRenewalMailto(plan.key, fleetLabel)}>{plan.cta}</a>
                </Button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-muted-foreground text-center text-xs">
          Paiements acceptés : Orange Money, MTN MoMo. Activation sous 24 h après confirmation.
        </p>
      </div>

      {momoDialog && (
        <MoMoPaymentDialog
          open={Boolean(momoDialog)}
          onClose={() => setMomoDialog(null)}
          planCode={momoDialog.planCode}
          planName={momoDialog.planName}
          vehicleCount={momoDialog.vehicleCount}
          amountXaf={momoDialog.amountXaf}
        />
      )}
    </div>
  );
}
