"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle,
  CreditCard,
  Crown,
  Loader2,
  Smartphone,
  Zap,
} from "lucide-react";
import { canManageBilling } from "@/lib/dashboard/roles";
import type {
  BillingOrg,
  BillingPlan,
  BillingUsage,
  CurrentSubscription,
  FleetBillingContext,
  PaymentTransaction,
} from "@/lib/dashboard/fetch-billing";
import { planFeatures } from "@/lib/dashboard/fetch-billing";
import { daysUntil } from "@/lib/days-until";
import { useNowMs } from "@/lib/hooks/use-now-ms";
import { redirectToUrl } from "@/lib/redirect";
import { cn, formatDate, formatXAF } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PLAN_ICONS: Record<string, typeof Zap> = {
  starter: Zap,
  pro: Crown,
  enterprise: Building2,
};

const BILLING_OPTIONS = [
  { value: "monthly", label: "Mensuel", months: 1, discount: 0 },
  { value: "quarterly", label: "Trimestriel", months: 3, discount: 0.05 },
  { value: "semi_annual", label: "Semestriel", months: 6, discount: 0.1 },
  { value: "annual", label: "Annuel", months: 12, discount: 0.17 },
] as const;

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active: {
    label: "Actif",
    className: "bg-green-500/10 text-green-600",
  },
  trial: {
    label: "Essai",
    className: "bg-primary/10 text-primary",
  },
  grace_period: {
    label: "Période de grâce",
    className: "bg-yellow-500/10 text-yellow-700",
  },
  suspended: {
    label: "Suspendu",
    className: "bg-destructive/10 text-destructive",
  },
  pending_payment: {
    label: "Paiement en attente",
    className: "bg-yellow-500/10 text-yellow-700",
  },
  expired: {
    label: "Expiré",
    className: "bg-destructive/10 text-destructive",
  },
  cancelled: {
    label: "Annulé",
    className: "bg-muted text-muted-foreground",
  },
};

const PROVIDER_LABELS: Record<string, string> = {
  notch: "NotchPay",
  notchpay: "NotchPay",
  fapshi: "Fapshi",
  mtn_momo: "MTN MoMo",
  orange_money: "Orange Money",
};

interface AbonnementClientProps {
  org: BillingOrg;
  billingContext: FleetBillingContext;
  currentSub: CurrentSubscription | null;
  transactions: PaymentTransaction[];
  plans: BillingPlan[];
  usage: BillingUsage;
  userRole: string;
  userEmail: string;
}

function resolveExpiryDate(
  currentSub: CurrentSubscription | null,
  billingContext: FleetBillingContext,
) {
  if (currentSub?.status === "trial" && currentSub.trialEndsAt) {
    return currentSub.trialEndsAt;
  }
  return currentSub?.endsAt ?? billingContext.subscriptionEndsAt;
}

export function AbonnementClient({
  org,
  billingContext,
  currentSub,
  transactions,
  plans,
  usage,
  userRole,
}: AbonnementClientProps) {
  const [billing, setBilling] =
    useState<(typeof BILLING_OPTIONS)[number]["value"]>("monthly");
  const [selectingPlanId, setSelectingPlanId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<"notchpay" | "fapshi">("notchpay");
  const [loading, setLoading] = useState(false);

  const nowMs = useNowMs();
  const canManage = canManageBilling(userRole);
  const billingOption =
    BILLING_OPTIONS.find((option) => option.value === billing) ??
    BILLING_OPTIONS[0];
  const expiryDate = resolveExpiryDate(currentSub, billingContext);
  const daysLeft =
    expiryDate && nowMs > 0
      ? Math.max(0, daysUntil(expiryDate, nowMs))
      : 0;
  const currentPlanCode =
    currentSub?.planCode ?? billingContext.planCode ?? "free";
  const currentStatus = currentSub?.status ?? billingContext.billingStatus;
  const statusCfg =
    STATUS_LABELS[currentStatus] ??
    STATUS_LABELS.trial;

  const vehicleUsageRatio =
    usage.maxVehicles > 0 ? usage.vehicles / usage.maxVehicles : 0;

  async function handleSubscribe(plan: BillingPlan) {
    if (!canManage) {
      toast.error("Seul l'organisateur peut gérer l'abonnement.");
      return;
    }

    setLoading(true);
    setSelectingPlanId(plan.id);

    try {
      const vehicleCount = Math.max(usage.vehicles, 1);

      const createRes = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, vehicleCount }),
      });

      const createData = (await createRes.json()) as {
        subscriptionId?: string;
        error?: string;
      };

      if (!createRes.ok || !createData.subscriptionId) {
        throw new Error(createData.error ?? "Création abonnement impossible.");
      }

      const payEndpoint =
        payMethod === "fapshi"
          ? "/api/payments/fapshi/initiate"
          : "/api/payments/notchpay/initiate";

      const payRes = await fetch(payEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: createData.subscriptionId,
          planCode: plan.code,
          vehicleCount,
          durationMonths: billingOption.months,
        }),
      });

      const payData = (await payRes.json()) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!payRes.ok || !payData.checkoutUrl) {
        throw new Error(payData.error ?? "Initiation paiement impossible.");
      }

      redirectToUrl(payData.checkoutUrl);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `Erreur paiement : ${error.message}`
          : "Erreur paiement.",
      );
      setLoading(false);
      setSelectingPlanId(null);
    }
  }

  function planPrice(plan: BillingPlan) {
    const base =
      plan.pricePerVehicle * Math.max(usage.vehicles, 1) * billingOption.months;
    return Math.round(base * (1 - billingOption.discount));
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Abonnement</h1>
        <p className="text-sm text-muted-foreground">
          Gérez votre plan et vos paiements · {org.name}
        </p>
      </div>

      <Card
        className={cn(
          "border-l-4",
          currentStatus === "active"
            ? "border-l-green-500"
            : currentStatus === "trial" || currentStatus === "pending_payment"
              ? "border-l-primary"
              : "border-l-destructive",
        )}
      >
        <CardContent className="px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold capitalize">
                  Plan {currentSub?.planName ?? billingContext.planName}
                </span>
                <Badge variant="outline" className={statusCfg.className}>
                  {statusCfg.label}
                </Badge>
              </div>
              {expiryDate ? (
                <p
                  className={cn(
                    "text-sm",
                    daysLeft <= 7
                      ? "font-medium text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {currentStatus === "trial"
                    ? `Essai — expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`
                    : `Renouvellement le ${formatDate(expiryDate)} (dans ${daysLeft}j)`}
                </p>
              ) : null}
            </div>

            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <p className="text-lg font-bold tabular-nums">
                  {usage.vehicles}
                </p>
                <p className="text-xs text-muted-foreground">
                  / {usage.maxVehicles} véhicules
                </p>
                <div className="mt-1 h-1.5 w-16 rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      vehicleUsageRatio > 0.8 ? "bg-destructive" : "bg-primary",
                    )}
                    style={{
                      width: `${Math.min(100, vehicleUsageRatio * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold tabular-nums">
                  {usage.drivers}
                </p>
                <p className="text-xs text-muted-foreground">conducteurs</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {canManage ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Choisir un plan</h2>
            <div className="flex flex-wrap items-center gap-2">
              {BILLING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBilling(option.value)}
                  className={cn(
                    "relative rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    billing === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50",
                  )}
                >
                  {option.label}
                  {option.discount > 0 ? (
                    <span className="absolute -top-2 -right-2 rounded-full bg-green-600 px-1 text-[9px] leading-tight text-white">
                      -{Math.round(option.discount * 100)}%
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPayMethod("notchpay")}
              className={cn(
                "flex flex-1 items-center gap-3 rounded-xl border-2 p-3 text-sm transition-all",
                payMethod === "notchpay"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30",
              )}
            >
              <CreditCard className="h-5 w-5 shrink-0 text-primary" />
              <div className="text-left">
                <p className="font-semibold">NotchPay</p>
                <p className="text-xs text-muted-foreground">
                  Carte, virement, Mobile Money
                </p>
              </div>
              {payMethod === "notchpay" ? (
                <CheckCircle className="ml-auto h-4 w-4 text-primary" />
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setPayMethod("fapshi")}
              className={cn(
                "flex flex-1 items-center gap-3 rounded-xl border-2 p-3 text-sm transition-all",
                payMethod === "fapshi"
                  ? "border-orange-500 bg-orange-500/5"
                  : "border-border hover:border-orange-300/50",
              )}
            >
              <Smartphone className="h-5 w-5 shrink-0 text-orange-500" />
              <div className="text-left">
                <p className="font-semibold">Fapshi</p>
                <p className="text-xs text-muted-foreground">
                  MTN MoMo · Orange Money
                </p>
              </div>
              {payMethod === "fapshi" ? (
                <CheckCircle className="ml-auto h-4 w-4 text-orange-500" />
              ) : null}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const Icon = PLAN_ICONS[plan.code] ?? Zap;
              const isCurrent = currentPlanCode === plan.code;
              const isRecommended = plan.code === "pro";
              const features = planFeatures(plan);

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "flex flex-col rounded-xl border-2 p-5 transition-all",
                    isRecommended
                      ? "border-primary shadow-md ring-2 ring-primary/10"
                      : "border-border",
                  )}
                >
                  {isRecommended ? (
                    <div className="mb-3 self-start rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      Recommandé
                    </div>
                  ) : null}

                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        plan.code === "enterprise"
                          ? "bg-purple-500/10"
                          : plan.code === "pro"
                            ? "bg-primary/10"
                            : "bg-muted",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          plan.code === "enterprise"
                            ? "text-purple-600"
                            : plan.code === "pro"
                              ? "text-primary"
                              : "text-muted-foreground",
                        )}
                      />
                    </div>
                    <h3 className="font-bold">{plan.name}</h3>
                  </div>

                  <div className="mb-4">
                    <span className="text-2xl font-extrabold tabular-nums">
                      {formatXAF(planPrice(plan))}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      / {billingOption.label.toLowerCase()}
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatXAF(plan.pricePerVehicle)} / véhicule / mois ·{" "}
                      {Math.max(usage.vehicles, 1)} véhicule(s)
                    </p>
                  </div>

                  <ul className="mb-5 flex-1 space-y-2">
                    {features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button
                      disabled
                      variant="outline"
                      className="w-full text-green-600"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Plan actuel
                    </Button>
                  ) : (
                    <Button
                      className={cn(
                        "w-full gap-2",
                        plan.code === "enterprise" &&
                          "bg-purple-600 hover:bg-purple-700",
                      )}
                      variant={plan.code === "starter" ? "outline" : "default"}
                      disabled={loading}
                      onClick={() => void handleSubscribe(plan)}
                    >
                      {loading && selectingPlanId === plan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : payMethod === "fapshi" ? (
                        <Smartphone className="h-4 w-4" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      Choisir ce plan
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {transactions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Historique des paiements
            </CardTitle>
            <CardDescription>Vos dernières transactions</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Méthode
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Référence
                  </TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(tx.createdAt)}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {formatXAF(tx.amount)}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {PROVIDER_LABELS[tx.provider] ?? tx.provider}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                      {tx.providerReference
                        ? `${tx.providerReference.slice(0, 16)}…`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="gap-1 bg-green-500/10 text-green-600"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Réussi
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
