import { useState } from "react";
import {
  CalendarClock, Plus, Trash2, ToggleLeft, ToggleRight,
  Info, Loader2, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { useAuth } from "@/hooks/useAuth";
import {
  useScheduledReports, useCreateScheduledReport, useToggleScheduledReport,
  useDeleteScheduledReport, type ScheduledReport, type ReportType,
  type ReportFrequency, type ReportFormat,
} from "@/hooks/useScheduledReports";
import { cn } from "@/lib/utils";
import {
  mobileScreenRootList, mobileScreenStack,
  mobileScreenSubtitle, mobileScreenTitle,
} from "@/lib/mobile/mobileUiTokens";

// ─── Labels ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ReportType, string> = {
  fleet_summary: "Résumé flotte",
  fuel_history: "Historique carburant",
  maintenance_due: "Entretiens à venir",
  driver_scores: "Scores conducteurs",
  incidents: "Incidents",
};

const FREQ_LABELS: Record<ReportFrequency, string> = {
  daily: "Quotidien",
  weekly: "Hebdomadaire",
  monthly: "Mensuel",
};

const FORMAT_LABELS: Record<ReportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
};

// ─── Create dialog ────────────────────────────────────────────────────────────

function CreateReportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [reportType, setReportType] = useState<ReportType>("fleet_summary");
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [frequency, setFrequency] = useState<ReportFrequency>("weekly");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [sendHour, setSendHour] = useState("6");
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<string[]>([]);

  const create = useCreateScheduledReport();

  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !emails.includes(e)) {
      setEmails([...emails, e]);
      setEmailInput("");
    }
  };

  const handleSubmit = () => {
    create.mutate(
      {
        report_type: reportType,
        format,
        frequency,
        day_of_week: frequency === "weekly" ? parseInt(dayOfWeek) : undefined,
        day_of_month: frequency === "monthly" ? parseInt(dayOfMonth) : undefined,
        send_hour_utc: parseInt(sendHour),
        recipient_emails: emails,
      },
      { onSuccess: onClose },
    );
  };

  const canSubmit = emails.length > 0 && !create.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau rapport programmé</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type de rapport</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as ReportType[]).map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Format + Fréquence */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ReportFormat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fréquence</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as ReportFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Quotidien</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Jour */}
          {frequency === "weekly" && (
            <div className="space-y-1.5">
              <Label>Jour de la semaine</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"].map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {frequency === "monthly" && (
            <div className="space-y-1.5">
              <Label>Jour du mois</Label>
              <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Heure */}
          <div className="space-y-1.5">
            <Label>Heure d'envoi (UTC)</Label>
            <Select value={sendHour} onValueChange={setSendHour}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                  <SelectItem key={h} value={String(h)}>{String(h).padStart(2,"0")}:00 UTC</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Destinataires */}
          <div className="space-y-2">
            <Label>Destinataires</Label>
            <div className="flex gap-2">
              <Input
                placeholder="email@exemple.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addEmail}>
                Ajouter
              </Button>
            </div>
            {emails.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {emails.map((e) => (
                  <Badge key={e} variant="secondary" className="gap-1 text-xs">
                    {e}
                    <button onClick={() => setEmails(emails.filter((x) => x !== e))} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer le rapport
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Report card ──────────────────────────────────────────────────────────────

function ReportCard({
  report,
  onToggle,
  onDelete,
}: {
  report: ScheduledReport;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const toggle = useToggleScheduledReport();
  const del = useDeleteScheduledReport();
  const nextRun = new Date(report.next_run_at).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <Card className={cn(!report.is_active && "opacity-60")}>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{TYPE_LABELS[report.report_type]}</p>
            <p className="text-xs text-muted-foreground">
              {FORMAT_LABELS[report.format]} · {FREQ_LABELS[report.frequency]}
            </p>
          </div>
          <Badge variant={report.is_active ? "default" : "secondary"} className="shrink-0 text-[0.7rem]">
            {report.is_active ? "Actif" : "Inactif"}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Prochaine exécution : {nextRun}</span>
        </div>

        {report.recipient_emails.length > 0 && (
          <p className="text-xs text-muted-foreground truncate">
            → {report.recipient_emails.join(", ")}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            size="sm" variant="outline" className="h-7 text-xs gap-1.5 flex-1"
            onClick={onToggle}
            disabled={toggle.isPending}
          >
            {toggle.isPending
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : report.is_active ? <ToggleLeft className="h-3 w-3" /> : <ToggleRight className="h-3 w-3" />}
            {report.is_active ? "Désactiver" : "Activer"}
          </Button>
          <Button
            size="sm" variant="ghost"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={del.isPending}
          >
            {del.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScheduledReportsPage() {
  const { userFleetId, isLoading: authLoading } = useAuth();
  const { data: reports = [], isLoading } = useScheduledReports();
  const toggle = useToggleScheduledReport();
  const del = useDeleteScheduledReport();

  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScheduledReport | null>(null);

  if (authLoading || isLoading) return <PageLoader />;

  if (!userFleetId) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <CalendarClock className="h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Aucune flotte active</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  const active = reports.filter((r) => r.is_active);
  const inactive = reports.filter((r) => !r.is_active);

  return (
    <div className={cn(mobileScreenRootList, mobileScreenStack)}>
      <header className="space-y-1.5">
        <h1 className={cn(mobileScreenTitle, "flex items-center gap-2.5")}>
          <CalendarClock className="h-7 w-7 shrink-0 text-primary" aria-hidden />
          <span>Rapports programmés</span>
        </h1>
        <p className={mobileScreenSubtitle}>
          Automatisez l'envoi de rapports PDF ou Excel par e-mail selon une fréquence définie.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: reports.length, color: "text-foreground" },
          { label: "Actifs", value: active.length, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Inactifs", value: inactive.length, color: "text-muted-foreground" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="py-3 text-center">
              <p className={cn("text-2xl font-bold", color)}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button className="gap-2 self-start" onClick={() => setShowCreate(true)}>
        <Plus className="h-4 w-4" />
        Nouveau rapport
      </Button>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
            <Info className="h-8 w-8" />
            <p className="text-sm">Aucun rapport programmé.</p>
            <p className="text-xs">Créez votre premier rapport pour l'envoyer automatiquement par e-mail.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {reports.map((r) => (
            <li key={r.id}>
              <ReportCard
                report={r}
                onToggle={() => toggle.mutate({ id: r.id, is_active: !r.is_active })}
                onDelete={() => setDeleteTarget(r)}
              />
            </li>
          ))}
        </ul>
      )}

      <CreateReportDialog open={showCreate} onClose={() => setShowCreate(false)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce rapport ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le rapport <strong>{deleteTarget && TYPE_LABELS[deleteTarget.report_type]}</strong> sera supprimé définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteTarget) { del.mutate(deleteTarget.id); setDeleteTarget(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
