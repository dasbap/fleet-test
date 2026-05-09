import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useFunnelMetrics } from "@/hooks/useFunnelTelemetry";

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "-";
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return `${Math.round(seconds)}s`;
  return `${minutes} min`;
}

export function FunnelTelemetryCard() {
  const { orgId } = useAuth();
  const { data, isLoading } = useFunnelMetrics(orgId ?? undefined, 30);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Suivi funnel (30 jours)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Suivi funnel (30 jours)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">Drop rate onboarding:</span>{" "}
          S1 {data.onboardingStep1DropRate.toFixed(1)}% · S2 {data.onboardingStep2DropRate.toFixed(1)}% · S3{" "}
          {data.onboardingStep3DropRate.toFixed(1)}% · S4 {data.onboardingStep4DropRate.toFixed(1)}%
        </p>
        <p>
          <span className="text-muted-foreground">Time-to-value moyen:</span> {formatDuration(data.avgTimeToValueSeconds)}
        </p>
        <p>
          <span className="text-muted-foreground">Succès action 1 clic:</span> {data.oneClickSuccessRate.toFixed(1)}% (
          {data.oneClickSuccessCount}/{data.oneClickAttemptCount})
        </p>
      </CardContent>
    </Card>
  );
}

