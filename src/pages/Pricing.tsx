import {
  Check,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Zap,
  BarChart3,
  Globe,
  X,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PublicPageLayout } from "@/components/landing/PublicPageLayout";
import { PublicPageHero } from "@/components/landing/PublicPageHero";
import { useBillingCheckout } from "@/hooks/useBillingCheckout";
import { usePageSeo } from "@/hooks/usePageSeo";
import { formatPublicPriceXaf } from "@/lib/public-pricing";
import { cn } from "@/lib/utils";

// ─── Constantes pricing ───────────────────────────────────────────────────

const PRICE_STARTER_PER_VEHICLE = 15_000; // FCFA / véhicule / mois
const PRICE_PRO_PER_VEHICLE     = 21_000; // FCFA / véhicule / mois

const DEFAULT_VEHICLE_COUNT = 1;
const MIN_VEHICLE_COUNT = 1;
const MAX_PUBLIC_VEHICLE_COUNT = 100;
const DEFAULT_DURATION_MONTHS = 1;
const DEFAULT_DISCOUNT_PCT = 0;

type PlanKey = "starter" | "pro" | "enterprise";

interface PlanConfig {
  code: PlanKey;
  name: string;
  tagline: string;
  pricePerVehicle: number | null; // null = devis
  maxVehicles: number | null;     // null = illimité
  features: string[];
  notIncluded?: string[];
  highlight?: boolean;
  ctaLabel: string;
  badge?: string;
}

const PLANS: PlanConfig[] = [
  {
    code: "starter",
    name: "Starter",
    tagline: "Flottes PME en croissance",
    pricePerVehicle: PRICE_STARTER_PER_VEHICLE,
    maxVehicles: 25,
    features: [
      "Jusqu'à 25 véhicules",
      "DVIR journaliers",
      "Alertes de base",
      "Module Finance & collectes",
      "Exports PDF / Excel",
      "Scoring conducteurs",
    ],
    notIncluded: [
      "IA Pulse+",
      "QR Premium (lot)",
    ],
    ctaLabel: "Payer avec Notch Pay",
  },
  {
    code: "pro",
    name: "Pro",
    tagline: "Flottes opérationnelles & terrain",
    pricePerVehicle: PRICE_PRO_PER_VEHICLE,
    maxVehicles: 100,
    features: [
      "Jusqu'à 100 véhicules",
      "Tout le plan Starter",
      "IA Pulse+ inclus",
      "QR codes d'activation Premium",
      "Rapports programmés",
      "Géofencing",
      "Monitoring fraude carburant",
      "Alertes avancées",
      "Support prioritaire",
      "API (future)",
    ],
    ctaLabel: "Payer avec Notch Pay",
    badge: "Populaire",
    highlight: true,
  },
  {
    code: "enterprise",
    name: "Organizer",
    tagline: "Multi-flottes & transporteurs régionaux",
    pricePerVehicle: null,
    maxVehicles: null,
    features: [
      "Véhicules illimités",
      "Multi-flottes & dashboard global",
      "Tout le plan Pro",
      "QR lot & activation terrain",
      "Rapports consolidés inter-flottes",
      "Intégration douane CEMAC",
      "Account manager dédié",
      "SLA garanti",
    ],
    ctaLabel: "Nous contacter",
  },
];

// ─── Composant principal ──────────────────────────────────────────────────

export default function PricingPage() {
  usePageSeo("pricing");
  const location = useLocation();
  const renewalPlan = parseRenewalPlan(location.search);
  const [vehicleCount, setVehicleCount] = useState(() =>
    parseVehicleCountParam(location.search),
  );
  const selectedDuration = DEFAULT_DURATION_MONTHS;

  const { state, initiate, reset, isLoading } = useBillingCheckout();

  // ─── Calculateur mensuel ──────────────────────────────────────────────

  function calcMonthlyTotal(pricePerVehicle: number): number {
    return pricePerVehicle * vehicleCount;
  }

  function calcTotalXaf(pricePerVehicle: number): number {
    return calcMonthlyTotal(pricePerVehicle) * selectedDuration;
  }

  function handleVehicleCountChange(value: string) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      setVehicleCount(MIN_VEHICLE_COUNT);
      return;
    }
    setVehicleCount(
      Math.min(MAX_PUBLIC_VEHICLE_COUNT, Math.max(MIN_VEHICLE_COUNT, parsed)),
    );
  }

  // ─── CTA checkout ─────────────────────────────────────────────────────

  async function handlePay(plan: PlanConfig) {
    if (plan.code === "enterprise") {
      return;
    }
    await initiate({
      planCode: plan.code,
      planName: plan.name,
      vehicleCount,
      durationMonths: selectedDuration,
      addOns: { pulse: false, qrPremium: false },
    });
  }

  // ─── Rendu ────────────────────────────────────────────────────────────

  return (
    <PublicPageLayout showWhatsApp={false}>
      <PublicPageHero
        eyebrow="Tarifs"
        title={
          <>
            Gérez votre flotte,{" "}
            <span className="text-gradient">payez à l&apos;usage</span>
          </>
        }
        description="Paiement Mobile Money via Notch Pay · Activation immédiate après confirmation · Résiliation possible à tout moment"
      />

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-20 md:py-32">

        {/* Feedback état paiement */}
        {state.status === "failed" && (
          <Alert variant="destructive" className="flex items-start gap-2">
            <X className="mt-0.5 h-4 w-4 shrink-0" />
            <AlertDescription className="flex flex-1 items-center justify-between">
              <span>{state.error}</span>
              <Button size="sm" variant="ghost" onClick={reset} className="ml-4 shrink-0">
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {state.status === "redirecting" && (
          <Alert className="border-primary/30 bg-primary/5">
            <Loader2 className="mt-0.5 h-4 w-4 animate-spin shrink-0" />
            <AlertDescription>
              Redirection vers Notch Pay en cours… réf.{" "}
              <span className="font-mono font-semibold">{state.reference}</span>
              {" — "}
              {formatPublicPriceXaf(state.amountXaf)} FCFA.
            </AlertDescription>
          </Alert>
        )}

        {/* ── Cartes plans ──────────────────────────────────────────────── */}
        <section>
          <div className="mx-auto mb-6 flex max-w-5xl flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <label htmlFor="pricing-vehicle-count" className="text-sm font-medium">
                Nombre de véhicules
              </label>
              <p className="text-xs text-muted-foreground">
                Le prix et les licences achetées suivent ce nombre.
              </p>
            </div>
            <input
              id="pricing-vehicle-count"
              aria-label="Nombre de vehicules"
              type="number"
              min={MIN_VEHICLE_COUNT}
              max={MAX_PUBLIC_VEHICLE_COUNT}
              step={1}
              value={vehicleCount}
              onChange={(event) => handleVehicleCountChange(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm tabular-nums outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-28"
            />
          </div>
          <div
            data-testid="pricing-plans-grid"
            className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                vehicleCount={vehicleCount}
                selectedDuration={selectedDuration}
                discountPct={DEFAULT_DISCOUNT_PCT}
                calcMonthly={calcMonthlyTotal}
                calcTotal={calcTotalXaf}
                isLoading={isLoading}
                isRenewalTarget={renewalPlan === plan.code}
                onPay={handlePay}
              />
            ))}
          </div>
        </section>

        {/* ── Note légale ───────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>
              L'activation de l'abonnement est effectuée exclusivement après confirmation du
              paiement via webhook sécurisé. Le frontend n'active jamais directement.
            </span>
          </div>
          <p>
            Paiement en XAF (FCFA) · Mobile Money (MTN, Orange) via Notch Pay.
          </p>
        </div>
      </div>

    </PublicPageLayout>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────

interface PlanCardProps {
  plan: PlanConfig;
  vehicleCount: number;
  selectedDuration: number;
  discountPct: number;
  calcMonthly: (price: number) => number;
  calcTotal: (price: number) => number;
  isLoading: boolean;
  isRenewalTarget: boolean;
  onPay: (plan: PlanConfig) => void;
}

function PlanCard({
  plan,
  vehicleCount,
  selectedDuration,
  discountPct,
  calcMonthly,
  calcTotal,
  isLoading,
  isRenewalTarget,
  onPay,
}: PlanCardProps) {
  const isPaid = plan.pricePerVehicle !== null && plan.pricePerVehicle > 0;
  const isEnterprise = plan.code === "enterprise";
  const showPayButton = !isEnterprise;

  const monthlyTotal = isPaid ? calcMonthly(plan.pricePerVehicle!) : 0;
  const grandTotal   = isPaid ? calcTotal(plan.pricePerVehicle!) : 0;

  const exceedsMax = plan.maxVehicles !== null && vehicleCount > plan.maxVehicles;

  return (
    <Card className={cn(
      "relative flex flex-col",
      plan.highlight && "border-primary shadow-md",
    )}>
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className={plan.highlight ? "bg-primary" : "bg-muted text-muted-foreground"}>
            {plan.badge}
          </Badge>
        </div>
      )}
      {isRenewalTarget ? (
        <Badge variant="secondary" className="absolute right-3 top-3">
          Renouvellement
        </Badge>
      ) : null}

      <CardHeader className="pt-8 pb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{plan.name}</h3>
          {plan.code === "pro" && <Zap className="h-4 w-4 text-amber-500" />}
          {plan.code === "enterprise" && <Globe className="h-4 w-4 text-blue-500" />}
          {plan.code === "starter" && <BarChart3 className="h-4 w-4 text-primary" />}
        </div>
        <p className="text-xs text-muted-foreground">{plan.tagline}</p>

        <div className="mt-3">
          {isEnterprise ? (
            <p className="text-2xl font-bold">Sur devis</p>
          ) : plan.pricePerVehicle === 0 ? (
            <p className="text-2xl font-bold">Gratuit</p>
          ) : (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums">
                  {formatPublicPriceXaf(monthlyTotal)}
                </span>
                <span className="text-xs text-muted-foreground">FCFA/mois</span>
              </div>
              {selectedDuration > 1 && (
                <p className="text-xs text-muted-foreground">
                  soit {formatPublicPriceXaf(grandTotal)} FCFA sur {selectedDuration} mois
                  {discountPct > 0 && (
                    <span className="ml-1 font-medium text-green-600">(-{discountPct}%)</span>
                  )}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatPublicPriceXaf(plan.pricePerVehicle!)} FCFA × {vehicleCount} véhicule{vehicleCount > 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 pt-4 pb-2">
        <ul className="space-y-2">
          {plan.features.map((feat) => (
            <li key={feat} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
              <span>{feat}</span>
            </li>
          ))}
          {plan.notIncluded?.map((feat) => (
            <li key={feat} className="flex items-start gap-2 text-sm text-muted-foreground">
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="flex flex-col gap-2 pt-4">
        {exceedsMax && !isEnterprise && (
          <p className="text-center text-xs text-amber-600">
            Ce plan est limité à {plan.maxVehicles} véhicule{(plan.maxVehicles ?? 0) > 1 ? "s" : ""}.
            Réduisez le nombre ou choisissez un plan supérieur.
          </p>
        )}

        {isEnterprise ? (
          <Button variant="outline" className="w-full" disabled>
            {plan.ctaLabel}
          </Button>
        ) : showPayButton ? (
          <Button
            className="w-full"
            variant={plan.highlight ? "default" : "outline"}
            disabled={isLoading || exceedsMax}
            onClick={() => onPay(plan)}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            {isLoading ? "Connexion Notch Pay…" : plan.ctaLabel}
          </Button>
        ) : null}

        {isPaid && !isEnterprise && (
          <p className="text-center text-xs text-muted-foreground">
            Activation après confirmation webhook · Résiliable
          </p>
        )}
      </CardFooter>
    </Card>
  );
}

function parseVehicleCountParam(search: string): number {
  const raw = new URLSearchParams(search).get("vehicles");
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_VEHICLE_COUNT;
  if (!Number.isFinite(parsed)) {
    return DEFAULT_VEHICLE_COUNT;
  }
  return Math.min(MAX_PUBLIC_VEHICLE_COUNT, Math.max(MIN_VEHICLE_COUNT, parsed));
}

function parseRenewalPlan(search: string): PlanKey | null {
  const plan = new URLSearchParams(search).get("plan");
  return plan === "starter" || plan === "pro" || plan === "enterprise" ? plan : null;
}
