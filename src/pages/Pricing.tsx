import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  ExternalLink,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  Zap,
  QrCode,
  BarChart3,
  Globe,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PublicPageLayout } from "@/components/landing/PublicPageLayout";
import { PublicPageHero } from "@/components/landing/PublicPageHero";
import { PublicCtaSection } from "@/components/landing/PublicCtaSection";
import { useBillingCheckout } from "@/hooks/useBillingCheckout";
import { usePageSeo } from "@/hooks/usePageSeo";
import { formatPublicPriceXaf } from "@/lib/public-pricing";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { cn } from "@/lib/utils";

// ─── Constantes pricing ───────────────────────────────────────────────────

const PRICE_STARTER_PER_VEHICLE = 15_000; // FCFA / véhicule / mois
const PRICE_PRO_PER_VEHICLE     = 21_000; // FCFA / véhicule / mois
const PRICE_ADDON_PULSE         = 3_500;  // FCFA / véhicule / mois
const PRICE_ADDON_QR            = 2_500;  // FCFA / véhicule / mois

const DURATION_OPTIONS: Array<{ months: number; label: string; discountPct: number }> = [
  { months: 1,  label: "1 mois",   discountPct: 0  },
  { months: 3,  label: "3 mois",   discountPct: 5  },
  { months: 6,  label: "6 mois",   discountPct: 10 },
  { months: 12, label: "12 mois",  discountPct: 15 },
];

type PlanKey = "free" | "starter" | "pro" | "enterprise";

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
    code: "free",
    name: "Free",
    tagline: "Découverte & petites flottes",
    pricePerVehicle: 0,
    maxVehicles: 3,
    features: [
      "Jusqu'à 3 véhicules",
      "DVIR journaliers",
      "Alertes de base",
      "Tableau de bord simplifié",
    ],
    notIncluded: [
      "IA Pulse+ (maintenance prédictive)",
      "Module Finance",
      "Exports PDF/Excel",
      "QR Premium",
    ],
    ctaLabel: "Commencer gratuitement",
    badge: "Gratuit",
  },
  {
    code: "starter",
    name: "Starter",
    tagline: "Flottes PME en croissance",
    pricePerVehicle: PRICE_STARTER_PER_VEHICLE,
    maxVehicles: 25,
    features: [
      "Jusqu'à 25 véhicules",
      "Tout le plan Free",
      "Module Finance & collectes",
      "Exports PDF / Excel",
      "Scoring conducteurs",
      "Alertes avancées",
      "Support prioritaire",
    ],
    notIncluded: [
      "IA Pulse+",
      "QR Premium (lot)",
    ],
    ctaLabel: "Payer avec Notch Pay",
    badge: "Populaire",
    highlight: true,
  },
  {
    code: "pro",
    name: "Pro",
    tagline: "Flottes opérationnelles & terrain",
    pricePerVehicle: PRICE_PRO_PER_VEHICLE,
    maxVehicles: 75,
    features: [
      "Jusqu'à 75 véhicules",
      "Tout le plan Starter",
      "IA Pulse+ inclus",
      "QR codes d'activation Premium",
      "Rapports programmés",
      "Géofencing",
      "Monitoring fraude carburant",
      "API (future)",
    ],
    ctaLabel: "Payer avec Notch Pay",
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
  const [vehicleCount, setVehicleCount] = useState(3);
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [addOnPulse, setAddOnPulse] = useState(false);
  const [addOnQr, setAddOnQr] = useState(false);

  const { state, initiate, reset, isLoading, bffAvailable } = useBillingCheckout();

  const duration = DURATION_OPTIONS.find((d) => d.months === selectedDuration)!;
  const discountFactor = 1 - duration.discountPct / 100;

  // ─── Calculateur mensuel ──────────────────────────────────────────────

  function calcMonthlyTotal(pricePerVehicle: number): number {
    let base = pricePerVehicle * vehicleCount;
    if (addOnPulse) base += PRICE_ADDON_PULSE * vehicleCount;
    if (addOnQr)    base += PRICE_ADDON_QR * vehicleCount;
    return Math.round(base * discountFactor);
  }

  function calcTotalXaf(pricePerVehicle: number): number {
    return calcMonthlyTotal(pricePerVehicle) * selectedDuration;
  }

  // ─── CTA checkout ─────────────────────────────────────────────────────

  async function handlePay(plan: PlanConfig) {
    if (plan.code === "enterprise") {
      window.location.href = `mailto:support@e-samba.com?subject=Devis%20Organizer%20E-Samba&body=Bonjour%2C%20je%20souhaite%20un%20devis%20pour%20le%20plan%20Organizer.`;
      return;
    }
    if (plan.code === "free") {
      return; // redirect géré par le lien
    }
    await initiate({
      planCode: plan.code,
      planName: plan.name,
      vehicleCount,
      durationMonths: selectedDuration,
      addOns: { pulse: addOnPulse, qrPremium: addOnQr },
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

        {/* ── Configurateur ─────────────────────────────────────────────── */}
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-6 font-semibold text-lg">Configurez votre abonnement</h2>

          {/* Nombre de véhicules */}
          <div className="mb-6 space-y-2">
            <label className="text-sm font-medium">Nombre de véhicules</label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setVehicleCount((n) => Math.max(1, n - 1))}
                disabled={vehicleCount <= 1}
                aria-label="Réduire"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center text-xl font-bold tabular-nums">
                {vehicleCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setVehicleCount((n) => Math.min(100, n + 1))}
                disabled={vehicleCount >= 100}
                aria-label="Augmenter"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                véhicule{vehicleCount > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Durée */}
          <div className="mb-6 space-y-2">
            <label className="text-sm font-medium">Durée d'engagement</label>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d.months}
                  onClick={() => setSelectedDuration(d.months)}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                    selectedDuration === d.months
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted",
                  )}
                >
                  {d.label}
                  {d.discountPct > 0 && (
                    <span className={cn(
                      "ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold",
                      selectedDuration === d.months
                        ? "bg-white/20 text-white"
                        : "bg-green-100 text-green-700",
                    )}>
                      -{d.discountPct}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Add-ons */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Options complémentaires</label>
            <div className="flex flex-wrap gap-3">
              <AddonToggle
                icon={<Zap className="h-4 w-4 text-amber-500" />}
                label="Pulse+"
                description={`IA prédictive — +${formatPublicPriceXaf(PRICE_ADDON_PULSE)} FCFA/véhicule/mois`}
                active={addOnPulse}
                onToggle={() => setAddOnPulse((v) => !v)}
              />
              <AddonToggle
                icon={<QrCode className="h-4 w-4 text-blue-500" />}
                label="QR Premium"
                description={`Activation lot — +${formatPublicPriceXaf(PRICE_ADDON_QR)} FCFA/véhicule/mois`}
                active={addOnQr}
                onToggle={() => setAddOnQr((v) => !v)}
              />
            </div>
          </div>
        </section>

        {/* ── Cartes plans ──────────────────────────────────────────────── */}
        <section>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                vehicleCount={vehicleCount}
                selectedDuration={selectedDuration}
                discountPct={duration.discountPct}
                calcMonthly={calcMonthlyTotal}
                calcTotal={calcTotalXaf}
                addOnPulse={addOnPulse}
                addOnQr={addOnQr}
                isLoading={isLoading}
                bffAvailable={bffAvailable}
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
            Paiement en XAF (FCFA) · Mobile Money (MTN, Orange) via Notch Pay ·{" "}
            <Link to={ROUTE_PATHS.contact} className="underline underline-offset-2">
              Nous contacter
            </Link>
          </p>
        </div>
      </div>

      <PublicCtaSection />
    </PublicPageLayout>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────

interface AddonToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}

function AddonToggle({ icon, label, description, active, onToggle }: AddonToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:bg-muted/40",
      )}
    >
      <div className={cn(
        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        active ? "bg-primary/10" : "bg-muted",
      )}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className={cn(
        "ml-auto mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
        active ? "border-primary bg-primary" : "border-muted-foreground/40",
      )} />
    </button>
  );
}

interface PlanCardProps {
  plan: PlanConfig;
  vehicleCount: number;
  selectedDuration: number;
  discountPct: number;
  calcMonthly: (price: number) => number;
  calcTotal: (price: number) => number;
  addOnPulse: boolean;
  addOnQr: boolean;
  isLoading: boolean;
  bffAvailable: boolean;
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
  bffAvailable,
  onPay,
}: PlanCardProps) {
  const isPaid = plan.pricePerVehicle !== null && plan.pricePerVehicle > 0;
  const isEnterprise = plan.code === "enterprise";
  const showPayButton = !isEnterprise && plan.code !== "free" && bffAvailable;

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

        {plan.code === "free" ? (
          <Button variant="outline" className="w-full" asChild>
            <Link to={ROUTE_PATHS.auth}>{plan.ctaLabel}</Link>
          </Button>
        ) : isEnterprise ? (
          <Button variant="outline" className="w-full" asChild>
            <a href="mailto:support@e-samba.com?subject=Devis%20Organizer">
              {plan.ctaLabel}
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
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
        ) : !bffAvailable ? (
          <Button variant="outline" className="w-full" asChild>
            <a href={`mailto:support@e-samba.com?subject=Abonnement%20E-Samba%20${plan.name}`}>
              Nous contacter
            </a>
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
