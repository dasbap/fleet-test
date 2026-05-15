import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { useFleetBillingContext } from "@/hooks/useFleetBillingContext";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  Zap,
  Car,
  CalendarClock,
  Clock,
} from "lucide-react";
import { formatDistanceToNow, format, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import type { BillingStatus } from "@/types/fleet-billing";

const PLANS = [
  {
    code: "free",
    name: "Gratuit",
    price: "0 FCFA",
    per: "30 jours d'essai",
    maxVehicles: "3 véhicules",
    features: ["Suivi GPS basique", "Incidents", "Clôtures conducteur"],
    locked: ["Finances", "Rapports", "Scoring", "Géofencing", "Rapports auto"],
    cta: "Plan actuel",
    highlight: false,
  },
  {
    code: "starter",
    name: "Starter",
    price: "15 000 FCFA",
    per: "/ véhicule / mois",
    maxVehicles: "Selon achat",
    features: ["Finances & encaissements", "Rapports d'activité", "Scoring conducteur", "Offline conducteur", "Maintenance préventive"],
    locked: ["Géofencing", "Rapports programmés"],
    cta: "Choisir Starter",
    highlight: false,
  },
  {
    code: "pro",
    name: "Pro",
    price: "21 000 FCFA",
    per: "/ véhicule / mois",
    maxVehicles: "Selon achat",
    features: ["Tout Starter", "Géofencing illimité", "Rapports auto PDF/Excel", "Alertes avancées", "Anomalies IA"],
    locked: [],
    cta: "Choisir Pro",
    highlight: true,
  },
  {
    code: "enterprise",
    name: "Entreprise",
    price: "Sur devis",
    per: "multi-sites • contrat",
    maxVehicles: "Illimité",
    features: ["Tout Pro", "Multi-flottes", "SLA dédié", "Intégrations sur mesure", "Support prioritaire"],
    locked: [],
    cta: "Nous contacter",
    highlight: false,
  },
];

const STATUS_CONFIG: Record<BillingStatus, { label: string; color: string; icon: React.ElementType }> = {
  trial:      { label: "Essai gratuit",       color: "bg-blue-100 text-blue-700",    icon: Clock },
  active:     { label: "Actif",               color: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  grace:      { label: "Période de grâce",    color: "bg-amber-100 text-amber-700",  icon: AlertTriangle },
  suspended:  { label: "Suspendu",            color: "bg-red-100 text-red-700",      icon: XCircle },
  enterprise: { label: "Entreprise",          color: "bg-purple-100 text-purple-700",icon: Zap },
};

/**
 * Gère le retour depuis Notch Pay (?status=success&ref=ESAMBA-xxx).
 * L'activation réelle est faite par le webhook — on informe simplement l'utilisateur.
 */
function useNotchPayCallback() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("status");
    const ref = searchParams.get("ref");
    if (!status) return;

    if (status === "success" || status === "complete") {
      toast({
        title: "Paiement reçu",
        description: ref
          ? `Référence ${ref} — activation en cours via webhook. Rechargez dans quelques instants.`
          : "Activation en cours via webhook. Rechargez dans quelques instants.",
      });
    } else if (status === "failed" || status === "cancelled") {
      toast({
        title: "Paiement non complété",
        description: "Le paiement a été annulé ou a échoué. Vous pouvez réessayer depuis /upgrade.",
        variant: "destructive",
      });
    }

    // Nettoie les params sans recharger la page
    const next = new URLSearchParams(searchParams);
    next.delete("status");
    next.delete("ref");
    setSearchParams(next, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default function BillingPage() {
  const { userFleetId } = useAuth();
  const navigate = useNavigate();
  const billing = useFleetBillingContext(userFleetId ?? undefined);
  useNotchPayCallback();

  if (billing.isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const ctx = billing.data;
  if (!ctx) return null;

  const statusCfg = STATUS_CONFIG[ctx.billingStatus] ?? STATUS_CONFIG.trial;
  const StatusIcon = statusCfg.icon;
  const slotUsagePct = Math.min(100, Math.round((ctx.vehicleCount / Math.max(1, ctx.vehicleSlots)) * 100));

  const expiryDate =
    ctx.billingStatus === "trial" ? ctx.trialEndsAt :
    ctx.billingStatus === "grace" ? ctx.graceUntil :
    ctx.subscriptionEndsAt;

  const expiryLabel = expiryDate
    ? isPast(new Date(expiryDate))
      ? `Expiré le ${format(new Date(expiryDate), "d MMM yyyy", { locale: fr })}`
      : `Expire ${formatDistanceToNow(new Date(expiryDate), { addSuffix: true, locale: fr })}`
    : null;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Abonnement</h1>
          <p className="text-muted-foreground text-sm">Gérez votre plan et vos licences véhicules</p>
        </div>
        <Badge className={`gap-1.5 px-3 py-1 text-sm font-medium ${statusCfg.color}`}>
          <StatusIcon className="w-4 h-4" />
          {statusCfg.label}
        </Badge>
      </div>

      {/* Alertes contextuelles */}
      {ctx.billingStatus === "suspended" && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-800">Flotte suspendue</p>
            <p className="text-sm text-red-700">Vos véhicules sont inactifs. Renouvelez votre abonnement pour les réactiver.</p>
          </div>
        </div>
      )}
      {ctx.billingStatus === "grace" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">Période de grâce — {expiryLabel}</p>
            <p className="text-sm text-amber-700">Votre accès est maintenu temporairement. Renouvelez avant la suspension automatique.</p>
          </div>
        </div>
      )}
      {ctx.billingStatus === "trial" && expiryLabel && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <Clock className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-blue-800">Essai gratuit — {expiryLabel}</p>
            <p className="text-sm text-blue-700">Passez à un plan payant pour continuer sans interruption.</p>
          </div>
        </div>
      )}

      {/* KPIs plan actuel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="w-4 h-4" /> Plan actif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{ctx.planName}</p>
            {expiryLabel && <p className="text-xs text-muted-foreground mt-1">{expiryLabel}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Car className="w-4 h-4" /> Licences véhicules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold">
              {ctx.vehicleCount}
              <span className="text-base font-normal text-muted-foreground">
                {" "}/ {ctx.vehicleSlots >= 999_999 ? "∞" : ctx.vehicleSlots}
              </span>
            </p>
            <Progress value={slotUsagePct} className="h-1.5" />
            <p className="text-xs text-muted-foreground">{ctx.activeVehicles} actif{ctx.activeVehicles !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarClock className="w-4 h-4" /> Prochain renouvellement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {ctx.subscriptionEndsAt
                ? format(new Date(ctx.subscriptionEndsAt), "d MMM yyyy", { locale: fr })
                : "—"}
            </p>
            {ctx.subscriptionEndsAt && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(ctx.subscriptionEndsAt), { addSuffix: true, locale: fr })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grille des plans */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Changer de plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = ctx.planCode === plan.code;
            return (
              <div
                key={plan.code}
                className={`relative flex flex-col rounded-xl border p-5 gap-4 ${
                  plan.highlight ? "border-primary shadow-md shadow-primary/10" : "border-border"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                    Recommandé
                  </span>
                )}
                <div>
                  <p className="font-bold text-base">{plan.name}</p>
                  <p className="text-xl font-extrabold mt-1">{plan.price}</p>
                  <p className="text-xs text-muted-foreground">{plan.per}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.maxVehicles}</p>
                </div>
                <ul className="space-y-1.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                  {plan.locked.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <XCircle className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant={isCurrent ? "outline" : plan.highlight ? "default" : "secondary"}
                  disabled={isCurrent}
                  className="w-full"
                  onClick={() => {
                    if (plan.code === "enterprise") {
                      window.open("mailto:contact@e-samba.africa?subject=Devis Entreprise", "_blank");
                    } else {
                      void navigate(ROUTE_PATHS.upgrade);
                    }
                  }}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {isCurrent ? "Plan actuel" : plan.cta}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modules activés */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Modules activés</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Finances",           enabled: ctx.financeEnabled },
            { label: "Rapports",           enabled: ctx.reportsEnabled },
            { label: "Scoring conducteur", enabled: ctx.driverScoringEnabled },
            { label: "Anomalies IA",       enabled: ctx.anomalyInsightsEnabled },
            { label: "Géofencing",         enabled: ctx.geofencingEnabled },
            { label: "Rapports auto",      enabled: ctx.scheduledReportsEnabled },
            { label: "Offline conducteur", enabled: ctx.offlineDriverEnabled },
            { label: "IA avancée",         enabled: ctx.aiEnabled },
          ].map(({ label, enabled }) => (
            <div
              key={label}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                enabled
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-border bg-muted/30 text-muted-foreground"
              }`}
            >
              {enabled
                ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                : <XCircle className="w-4 h-4 text-muted-foreground/50 shrink-0" />}
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
