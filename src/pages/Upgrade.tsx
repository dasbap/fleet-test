import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AlertTriangle, Check, ExternalLink, Loader2, Smartphone, Zap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { useAuth } from "@/hooks/useAuth";
import { useBilling } from "@/hooks/useBilling";
import { useNotchPayPayment } from "@/hooks/useNotchPayPayment";
import {
  PUBLIC_BILLING_PERIOD_LABEL,
  PUBLIC_CURRENCY_LABEL,
  PUBLIC_PRICE_PRO_PER_VEHICLE_XAF,
  PUBLIC_PRICE_STARTER_PER_VEHICLE_XAF,
  formatPublicPriceXaf,
} from "@/lib/public-pricing";
import { cn } from "@/lib/utils";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { buildSupportMailto } from "@/config/navigation";
import { MoMoPaymentDialog } from "@/components/billing/MoMoPaymentDialog";
import { isBffConfigured } from "@/lib/bff-config";

type PlanKey = "starter" | "pro";

function buildRenewalMailto(plan: PlanKey, fleetLabel: string): string {
  const subjects: Record<PlanKey, string> = {
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

  return buildSupportMailto(subjects[plan], body);
}

const DEFAULT_VEHICLE_COUNTS: Record<PlanKey, number> = {
  starter: 3,
  pro: 5,
};

const PLAN_VEHICLE_LIMITS: Record<PlanKey, number> = {
  starter: 25,
  pro: 100,
};

const MIN_VEHICLE_COUNT = 1;

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
    key: "starter",
    name: "Starter",
    description: "Pour les petites flottes qui démarrent",
    price: formatPublicPriceXaf(PUBLIC_PRICE_STARTER_PER_VEHICLE_XAF),
    priceXAF: PUBLIC_PRICE_STARTER_PER_VEHICLE_XAF,
    popular: false,
    features: [
      "Jusqu'à 25 véhicules",
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
      "Jusqu'à 100 véhicules",
      "Jusqu'à 3 rôles Gestionnaire",
      "Suite complète et scoring",
      "Alertes intelligentes",
      "Support prioritaire",
    ],
    cta: "Renouveler Pro",
  },
];

/**
 * Offres et renouvellement : affiché lorsque le plan payant est expiré (`lapsedPaid`)
 * ou accès direct à `/upgrade`.
 */
export default function Upgrade() {
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
  const [selectedVehicleCounts, setSelectedVehicleCounts] = useState(DEFAULT_VEHICLE_COUNTS);

  const notchPay = useNotchPayPayment();
  // Quelle carte est en cours de paiement Notch Pay
  const [notchPendingKey, setNotchPendingKey] = useState<PlanKey | null>(null);

  const notchAvailable = isBffConfigured();

  function handleVehicleCountChange(planKey: PlanKey, value: string) {
    const parsed = Number.parseInt(value, 10);
    const limit = PLAN_VEHICLE_LIMITS[planKey];
    const nextValue = Number.isFinite(parsed)
      ? Math.min(limit, Math.max(MIN_VEHICLE_COUNT, parsed))
      : MIN_VEHICLE_COUNT;

    setSelectedVehicleCounts((current) => ({
      ...current,
      [planKey]: nextValue,
    }));
  }

  if (authLoading) return <PageLoader />;
  if (!user) return <Navigate to={ROUTE_PATHS.auth} replace />;
  if (isTenantOrgLoading) return <PageLoader />;
  if (!canQueryBilling) return <Navigate to={ROUTE_PATHS.tenantBootstrap} replace />;
  if (billingLoading) return <PageLoader />;

  const fleetLabel = [orgId, fleetId].filter(Boolean).join(" / ");

  function handleNotchPay(plan: typeof upgradePlans[number]) {
    if (notchPay.isPending) return;
    const vehicleCount = selectedVehicleCounts[plan.key];
    setNotchPendingKey(plan.key);
    notchPay.mutate(
      {
        planCode: plan.key,
        planName: plan.name,
        vehicleCount,
        durationMonths: 1,
      },
      {
        onSettled: () => setNotchPendingKey(null),
      },
    );
  }

  return (
    <div className="bg-muted/30 min-h-screen py-10 md:py-16">
      <div className="container mx-auto max-w-6xl space-y-8 px-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-primary text-sm font-medium uppercase tracking-wider">E-Samba</p>
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
              Votre abonnement payant n'est plus actif. Renouvelez un plan ou contactez-nous
              pour adapter votre formule afin de retrouver l'accès complet aux fonctionnalités
              concernées.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {upgradePlans.map((plan) => {
            const isPendingThis = notchPendingKey === plan.key;
            const vehicleCount = selectedVehicleCounts[plan.key];
            const vehicleLimit = PLAN_VEHICLE_LIMITS[plan.key];

            return (
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
                  <div className="mb-2 rounded-lg border bg-muted/30 p-3">
                    <label
                      htmlFor={`upgrade-vehicle-count-${plan.key}`}
                      className="text-xs font-medium"
                    >
                      Nombre de vehicules
                    </label>
                    <input
                      id={`upgrade-vehicle-count-${plan.key}`}
                      aria-label={`Nombre de vehicules ${plan.name}`}
                      type="number"
                      min={MIN_VEHICLE_COUNT}
                      max={vehicleLimit}
                      step={1}
                      value={vehicleCount}
                      onChange={(event) => handleVehicleCountChange(plan.key, event.target.value)}
                      className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm tabular-nums outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  {/* Bouton Notch Pay — paiement automatisé (webhook) */}
                  {notchAvailable && (
                    <Button
                      className="w-full"
                      onClick={() => handleNotchPay(plan)}
                      disabled={notchPay.isPending}
                    >
                      {isPendingThis ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          Redirection…
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-1.5" />
                          Payer avec Notch Pay
                        </>
                      )}
                    </Button>
                  )}

                  {/* Bouton Mobile Money manuel (Orange / MTN) */}
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    variant="default"
                    disabled={notchPay.isPending}
                    onClick={() => {
                      const pricePerVehicle =
                        plan.key === "pro"
                          ? PUBLIC_PRICE_PRO_PER_VEHICLE_XAF
                          : PUBLIC_PRICE_STARTER_PER_VEHICLE_XAF;
                      setMomoDialog({
                        planCode: plan.key,
                        planName: plan.name,
                        vehicleCount,
                        amountXaf: pricePerVehicle * vehicleCount,
                      });
                    }}
                  >
                    <Smartphone className="h-4 w-4 mr-1.5" />
                    Payer Mobile Money
                  </Button>

                  {/* Contact support */}
                  <Button
                    className="w-full"
                    variant="outline"
                    asChild
                  >
                    <a href={buildRenewalMailto(plan.key, fleetLabel)}>{plan.cta}</a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-muted-foreground text-center text-xs">
          Paiements acceptés : Notch Pay (Mobile Money CM/Afrique), Orange Money, MTN MoMo.{" "}
          {notchAvailable
            ? "Activation automatique après confirmation webhook."
            : "Activation sous 24 h après confirmation."}
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
