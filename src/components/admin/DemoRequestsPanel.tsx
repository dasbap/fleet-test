import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminDemoRequests,
  useFinalizeDemoRequest,
  useUpdateDemoRequestAutoMode,
} from "@/hooks/useAdminDemoRequests";
import { isDemoRequestSchemaMissingError } from "@/repositories/admin-demo-request.repository";
import type { CreateDemoPayload } from "@/hooks/useAdminDemoAccounts";
import type { AdminDemoRequest, DemoRequestAutoDecision } from "@/types/demo-request";

interface DemoRequestsPanelProps {
  onCreateAccess: (
    payload: CreateDemoPayload,
  ) => Promise<{ ok: boolean; user_id?: string; magic_url?: string; error?: string }>;
  onReloadSessions: () => Promise<void>;
}

function buildCompanyLabel(request: AdminDemoRequest): string {
  return [request.company, request.company_identifier, request.country_code].filter(Boolean).join(" - ");
}

function buildRequestDetails(request: AdminDemoRequest): Array<{ label: string; value: string }> {
  return [
    { label: "Telephone", value: request.phone ?? "" },
    { label: "Source", value: request.source ?? "" },
  ].filter((detail) => detail.value.trim().length > 0);
}

export function DemoRequestsPanel({ onCreateAccess, onReloadSessions }: DemoRequestsPanelProps) {
  const [includeProcessed, setIncludeProcessed] = useState(false);
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data: requests = [], error, isError, isLoading, refetch } = useAdminDemoRequests(includeProcessed);
  const finalizeRequest = useFinalizeDemoRequest();
  const updateAutoMode = useUpdateDemoRequestAutoMode();

  const settings = requests[0];
  const [autoSettings, setAutoSettings] = useState<{
    enabled: boolean;
    decision: DemoRequestAutoDecision;
  }>({
    enabled: false,
    decision: "refuse",
  });
  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === "pending").length,
    [requests],
  );
  const isSchemaMissing = isError && isDemoRequestSchemaMissingError(error);

  useEffect(() => {
    if (!settings) return;
    setAutoSettings({
      enabled: settings.auto_decision_enabled,
      decision: settings.auto_decision,
    });
  }, [settings?.auto_decision_enabled, settings?.auto_decision]);

  function saveAutoSettings(nextSettings: {
    enabled: boolean;
    decision: DemoRequestAutoDecision;
  }) {
    setAutoSettings(nextSettings);
    updateAutoMode.mutate(nextSettings);
  }

  async function acceptRequest(request: AdminDemoRequest) {
    setBusyId(request.id);
    try {
      const result = await onCreateAccess({
        email: request.email,
        company_name: request.company ?? request.full_name,
        account_type: "prospect",
        trial_days: 7,
        label: `Demande demo ${request.full_name}`,
        send_email: false,
      });
      if (!result.ok) throw new Error(result.error ?? "Creation demo impossible.");
      await finalizeRequest.mutateAsync({
        requestId: request.id,
        status: "accepted",
        reason: reasonById[request.id] ?? null,
        provisionedUserId: result.user_id ?? null,
        invitationUrl: result.magic_url ?? null,
      });
      await onReloadSessions();
    } finally {
      setBusyId(null);
    }
  }

  async function refuseRequest(request: AdminDemoRequest) {
    await finalizeRequest.mutateAsync({
      requestId: request.id,
      status: "refused",
      reason: reasonById[request.id] ?? "Demande refusee par un admin.",
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demandes de demo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {pendingCount} demande{pendingCount > 1 ? "s" : ""} en attente.
            </p>
            <div className="flex items-center gap-2">
              <Switch
                id="demo-auto-mode"
                checked={autoSettings.enabled}
                onCheckedChange={(enabled) =>
                  saveAutoSettings({
                    enabled,
                    decision: autoSettings.decision,
                  })
                }
              />
              <Label htmlFor="demo-auto-mode">Decision automatique apres 48h</Label>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={autoSettings.decision}
              onValueChange={(decision: DemoRequestAutoDecision) =>
                saveAutoSettings({
                  enabled: autoSettings.enabled,
                  decision,
                })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="refuse">Refuser auto</SelectItem>
                <SelectItem value="accept">Accepter auto</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={() => void refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
              Actualiser
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIncludeProcessed((value) => !value)}
            >
              {includeProcessed ? "Masquer traitees" : "Voir traitees"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isSchemaMissing ? (
        <Alert>
          <AlertDescription>
            La migration des demandes demo n'est pas appliquee sur cette base. Applique la
            migration support FAQ/demo puis actualise le cache PostgREST.
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune demande demo.</p>
      ) : (
        <div className="grid gap-3">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium">{request.full_name}</p>
                    <p className="text-sm text-muted-foreground">{request.email}</p>
                    <p className="text-xs text-muted-foreground">{buildCompanyLabel(request)}</p>
                    <dl className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      {buildRequestDetails(request).map((detail) => (
                        <div key={detail.label}>
                          <dt className="font-medium text-foreground">{detail.label}</dt>
                          <dd>{detail.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <span className="rounded-md border px-2 py-1 text-xs uppercase">
                    {request.status}
                  </span>
                </div>
                {request.message ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                    {request.message}
                  </div>
                ) : null}
                {request.status === "pending" ? (
                  <>
                    <Input
                      value={reasonById[request.id] ?? ""}
                      onChange={(event) =>
                        setReasonById((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))
                      }
                      placeholder="Note interne ou raison de decision"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        onClick={() => void acceptRequest(request)}
                        disabled={busyId === request.id || finalizeRequest.isPending}
                      >
                        {busyId === request.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Check className="mr-2 h-4 w-4" aria-hidden />
                        )}
                        Accepter et creer le compte
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void refuseRequest(request)}
                        disabled={finalizeRequest.isPending}
                      >
                        <X className="mr-2 h-4 w-4" aria-hidden />
                        Refuser
                      </Button>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
