import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock3, Mail, Play, RefreshCw, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface EmailDeliveryStats {
  provider: string;
  plan_name: string;
  provider_daily_limit: number;
  provider_monthly_limit: number;
  safety_daily_limit: number;
  safety_monthly_limit: number;
  requests_per_second: number;
  daily_used: number;
  daily_remaining: number;
  monthly_used: number;
  monthly_remaining: number;
  pending: number;
  abandoned: number;
  oldest_pending_at: string | null;
  day_resets_at: string;
  month_resets_at: string;
}

interface QueueProcessResult {
  ok?: boolean;
  processed?: number;
  sent?: number;
  failed?: number;
  abandoned?: number;
  deferred?: number;
  error?: string;
}

async function fetchEmailDeliveryStats(): Promise<EmailDeliveryStats> {
  const { data, error } = await supabase.rpc("admin_get_email_delivery_stats" as never);
  if (error) throw new Error(error.message);
  return data as unknown as EmailDeliveryStats;
}

function percent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function formatDate(value: string | null): string {
  if (!value) return "Aucun";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const width = percent(used, limit);
  return (
    <div className="space-y-2">
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${width}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{width}% du budget de sécurité utilisé</p>
    </div>
  );
}

export function EmailDeliveryPanel() {
  const [isProcessing, setProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState<string | null>(null);
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-email-delivery-stats"],
    queryFn: fetchEmailDeliveryStats,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const processQueue = async () => {
    setProcessing(true);
    setProcessMessage(null);
    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;
      if (!token) throw new Error("Session administrateur expirée");

      const response = await fetch("/api/admin/process-email-queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const result = (await response.json()) as QueueProcessResult;
      if (!response.ok || result.ok === false) {
        throw new Error(result.error ?? "Traitement de la file impossible");
      }

      setProcessMessage(
        `${result.sent ?? 0} envoyé(s), ${result.deferred ?? 0} différé(s), ${result.failed ?? 0} échec(s).`,
      );
      await refetch();
    } catch (queueError) {
      setProcessMessage(queueError instanceof Error ? queueError.message : "Traitement de la file impossible");
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Chargement des limites e-mail…</div>;
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Impossible de charger les statistiques e-mail. {error instanceof Error ? error.message : ""}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Limites et file d'attente e-mail</h2>
          <p className="text-sm text-muted-foreground">
            Budget de sécurité appliqué avant chaque envoi afin de rester sous les limites Resend.
          </p>
          {processMessage ? <p className="mt-2 text-xs text-muted-foreground">{processMessage}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => void processQueue()}
            disabled={isProcessing || data.pending === 0 || data.daily_remaining === 0 || data.monthly_remaining === 0}
          >
            <Play className={`mr-2 h-4 w-4 ${isProcessing ? "animate-pulse" : ""}`} />
            {isProcessing ? "Traitement…" : "Traiter la file"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4" /> Aujourd'hui
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{data.daily_used} / {data.safety_daily_limit}</div>
            <p className="text-xs text-muted-foreground">{data.daily_remaining} envoi(s) restant(s)</p>
            <UsageBar used={data.daily_used} limit={data.safety_daily_limit} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4" /> Ce mois
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{data.monthly_used} / {data.safety_monthly_limit}</div>
            <p className="text-xs text-muted-foreground">{data.monthly_remaining} envoi(s) restant(s)</p>
            <UsageBar used={data.monthly_used} limit={data.safety_monthly_limit} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock3 className="h-4 w-4" /> File d'attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pending}</div>
            <p className="mt-1 text-xs text-muted-foreground">Plus ancien : {formatDate(data.oldest_pending_at)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" /> En erreur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.abandoned}</div>
            <p className="mt-1 text-xs text-muted-foreground">E-mails abandonnés après plusieurs tentatives</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration Resend protégée</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Profil</p>
            <p className="font-medium capitalize">{data.provider} · {data.plan_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Limite fournisseur / jour</p>
            <p className="font-medium">{data.provider_daily_limit}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Limite fournisseur / mois</p>
            <p className="font-medium">{data.provider_monthly_limit}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Marge de sécurité / jour</p>
            <p className="font-medium">{data.safety_daily_limit}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Marge de sécurité / mois</p>
            <p className="font-medium">{data.safety_monthly_limit}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Cadence maximale</p>
            <p className="font-medium">{data.requests_per_second} requêtes/s</p>
          </div>
          <div>
            <p className="text-muted-foreground">Réinitialisation quotidienne</p>
            <p className="font-medium">{formatDate(data.day_resets_at)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Réinitialisation mensuelle</p>
            <p className="font-medium">{formatDate(data.month_resets_at)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
