import { useMemo, useState } from "react";
import { AlertTriangle, Bell, Info, FileWarning, Check, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { useAuth } from "@/hooks/useAuth";
import { useAlertsList, useResolveAlert, type Alert } from "@/hooks/useAlerts";
import { useExpiringDocuments } from "@/hooks/useExpiringDocuments";
import { useSubmitFaqQuestion } from "@/hooks/useFaqQuestions";
import { cn } from "@/lib/utils";
import {
  mobileFormLabelOverline,
  mobileScreenRootList,
  mobileScreenStack,
  mobileScreenSubtitle,
  mobileScreenTitle,
} from "@/lib/mobile/mobileUiTokens";

type SeverityFilter = "all" | Alert["severity"];
type StatusFilter = "all" | Alert["status"];
type TypeFilter = "all" | Alert["type"];
type SortOption = "priority" | "date_desc";

const SEVERITY_LABELS: Record<Alert["severity"], string> = {
  critical: "Critique",
  warning: "Avertissement",
  info: "Info",
};

const STATUS_LABELS: Record<Alert["status"], string> = {
  open: "Ouverte",
  acknowledged: "Pris en compte",
  resolved: "Résolue",
};

const TYPE_LABELS: Record<Alert["type"], string> = {
  missing_closure: "Clôture manquante",
  recurring_gap: "Écart récurrent",
  risky_driver: "Conducteur à risque",
  vehicle_blocked: "Véhicule bloqué",
  maintenance_due: "Entretien dû",
  document_expired: "Document expiré",
  failure_risk: "Risque de panne",
  geofence_exit: "Sortie zone",
  faq_answer: "Reponse FAQ",
};

function sortAlerts(alerts: Alert[], sortBy: SortOption): Alert[] {
  if (sortBy === "date_desc") {
    return [...alerts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  const severityOrder: Record<Alert["severity"], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  return [...alerts].sort((a, b) => {
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/** Liste d’alertes opérationnelles (web + mobile) avec filtres et tri. */
export default function MobileAlertsPage() {
  const { user, userFleetId, isLoading: authLoading } = useAuth();
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("open");
  const [type, setType] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("priority");
  const [replyAlertId, setReplyAlertId] = useState<string | null>(null);
  const [replyByAlertId, setReplyByAlertId] = useState<Record<string, string>>({});
  const submitFaqQuestion = useSubmitFaqQuestion();
  const resolveAlert = useResolveAlert();

  const { data, isLoading } = useAlertsList({
    severity: severity === "all" ? undefined : severity,
    status: status === "all" ? undefined : status,
    type: type === "all" ? undefined : type,
    search: search || undefined,
  });

  const { criticalCount: docCriticalCount, expired: expiredDocs, expiringSoon } = useExpiringDocuments(30);

  const alerts = useMemo(
    () => sortAlerts(data || [], sortBy),
    [data, sortBy],
  );

  async function submitFaqFollowUp(alert: Alert) {
    const question = (replyByAlertId[alert.id] ?? "").trim();
    if (!question || !alert.faqQuestionId) return;
    await submitFaqQuestion.mutateAsync({
      question,
      parentQuestionId: alert.faqQuestionId,
    });
    setReplyByAlertId((current) => ({ ...current, [alert.id]: "" }));
    setReplyAlertId(null);
  }

  async function markAlertRead(alert: Alert) {
    if (!user?.id) return;
    await resolveAlert.mutateAsync({
      alertId: alert.id,
      resolvedBy: user.id,
    });
  }

  if (authLoading) {
    return <PageLoader />;
  }

  if (!userFleetId) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <Bell className="h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Aucune flotte sélectionnée</h2>
            <p className="text-sm text-muted-foreground">
              Rejoignez ou créez une flotte pour suivre les alertes opérationnelles en temps réel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn(mobileScreenRootList, mobileScreenStack)}>
      <header className="space-y-1.5">
        <h1 className={cn(mobileScreenTitle, "flex items-center gap-2.5")}>
          <AlertTriangle className="h-7 w-7 shrink-0 text-warning" aria-hidden />
          <span>Alertes opérationnelles</span>
        </h1>
        <p className={mobileScreenSubtitle}>
          Suivi des alertes générées automatiquement par la flotte : type, gravité et statut.
        </p>
      </header>

      {docCriticalCount > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40">
          <CardContent className="flex items-start gap-3 py-4">
            <FileWarning className="h-5 w-5 shrink-0 text-orange-500 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                {expiredDocs.length > 0
                  ? `${expiredDocs.length} permis expiré${expiredDocs.length > 1 ? "s" : ""}`
                  : ""}
                {expiredDocs.length > 0 && expiringSoon.length > 0 ? " · " : ""}
                {expiringSoon.length > 0
                  ? `${expiringSoon.length} expire${expiringSoon.length > 1 ? "nt" : ""} dans ≤ 7 j`
                  : ""}
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
                Renouvelez les permis conducteurs concernés pour maintenir la conformité.
              </p>
            </div>
            <button
              className="text-xs text-orange-600 dark:text-orange-400 font-medium underline underline-offset-2 shrink-0"
              onClick={() => setType("document_expired")}
            >
              Filtrer
            </button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <p className={mobileFormLabelOverline}>Recherche</p>
              <Input
                placeholder="Rechercher par titre ou message…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 md:w-[220px]">
              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priorité (gravité & date)</SelectItem>
                  <SelectItem value="date_desc">Date (plus récentes)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <p className={mobileFormLabelOverline}>Gravité</p>
              <Select value={severity} onValueChange={(value: SeverityFilter) => setSeverity(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les gravités" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes gravités</SelectItem>
                  <SelectItem value="critical">{SEVERITY_LABELS.critical}</SelectItem>
                  <SelectItem value="warning">{SEVERITY_LABELS.warning}</SelectItem>
                  <SelectItem value="info">{SEVERITY_LABELS.info}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className={mobileFormLabelOverline}>Statut</p>
              <Select value={status} onValueChange={(value: StatusFilter) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="open">{STATUS_LABELS.open}</SelectItem>
                  <SelectItem value="acknowledged">{STATUS_LABELS.acknowledged}</SelectItem>
                  <SelectItem value="resolved">{STATUS_LABELS.resolved}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className={mobileFormLabelOverline}>Type</p>
              <Select value={type} onValueChange={(value: TypeFilter) => setType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="missing_closure">{TYPE_LABELS.missing_closure}</SelectItem>
                  <SelectItem value="recurring_gap">{TYPE_LABELS.recurring_gap}</SelectItem>
                  <SelectItem value="risky_driver">{TYPE_LABELS.risky_driver}</SelectItem>
                  <SelectItem value="vehicle_blocked">{TYPE_LABELS.vehicle_blocked}</SelectItem>
                  <SelectItem value="maintenance_due">{TYPE_LABELS.maintenance_due}</SelectItem>
                  <SelectItem value="document_expired">{TYPE_LABELS.document_expired}</SelectItem>
                  <SelectItem value="failure_risk">{TYPE_LABELS.failure_risk}</SelectItem>
                  <SelectItem value="geofence_exit">{TYPE_LABELS.geofence_exit}</SelectItem>
                  <SelectItem value="faq_answer">{TYPE_LABELS.faq_answer}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <PageLoader />
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
            <Info className="h-8 w-8" />
            <p>Aucune alerte ne correspond à ces filtres.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-2 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {TYPE_LABELS[alert.type]}
                      </p>
                      <h2 className="line-clamp-2 text-sm font-semibold sm:text-base">
                        {alert.title}
                      </h2>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={
                          alert.severity === "critical"
                            ? "destructive"
                            : alert.severity === "warning"
                            ? "outline"
                            : "secondary"
                        }
                        className="text-[0.7rem] uppercase tracking-wide"
                      >
                        {SEVERITY_LABELS[alert.severity]}
                      </Badge>
                      <Badge
                        variant={alert.status === "resolved" ? "outline" : "default"}
                        className="text-[0.7rem] uppercase tracking-wide"
                      >
                        {STATUS_LABELS[alert.status]}
                      </Badge>
                    </div>
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {alert.message}
                  </p>
                  <p className="mt-auto text-xs text-muted-foreground">
                    Créée le {new Date(alert.createdAt).toLocaleString()}
                  </p>
                  {alert.type === "faq_answer" && alert.faqQuestionId && alert.status !== "resolved" ? (
                    <div className="space-y-2 pt-2">
                      {replyAlertId === alert.id ? (
                        <div className="space-y-2">
                          <label
                            htmlFor={`faq-follow-up-${alert.id}`}
                            className="text-xs font-medium text-muted-foreground"
                          >
                            Nouvelle question
                          </label>
                          <Textarea
                            id={`faq-follow-up-${alert.id}`}
                            rows={3}
                            value={replyByAlertId[alert.id] ?? ""}
                            onChange={(event) =>
                              setReplyByAlertId((current) => ({
                                ...current,
                                [alert.id]: event.target.value,
                              }))
                            }
                            placeholder="Expliquez ce qui reste flou..."
                          />
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                              type="button"
                              onClick={() => void submitFaqFollowUp(alert)}
                              disabled={
                                submitFaqQuestion.isPending ||
                                (replyByAlertId[alert.id] ?? "").trim().length < 8
                              }
                            >
                              <Send className="mr-2 h-4 w-4" aria-hidden />
                              Envoyer la relance
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setReplyAlertId(null)}
                            >
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setReplyAlertId(alert.id)}
                          >
                            Reposer une question
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => void markAlertRead(alert)}
                            disabled={resolveAlert.isPending}
                          >
                            <Check className="mr-2 h-4 w-4" aria-hidden />
                            Marquer comme lu
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
