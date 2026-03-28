import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import {
  ArrowLeft,
  Camera,
  History,
  MessageSquare,
  Paperclip,
  Phone,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import type { AuthUser } from "@/types/auth";
import { toast } from "@/hooks/use-toast";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { INCIDENT_KIND_LABELS } from "@/features/alerts/lib/incidentLabels";
import { IncidentAttachmentPlaceholder } from "@/features/alerts/components/IncidentAttachmentPlaceholder";
import { IncidentSeverityBadge } from "@/features/alerts/components/IncidentSeverityBadge";
import { IncidentStatusBadge } from "@/features/alerts/components/IncidentStatusBadge";
import { MOCK_INCIDENT_ASSIGNEES } from "@/features/alerts/data/mockAssignees";
import {
  addIncidentComment,
  assignIncident,
  resolveAssigneeById,
  updateIncidentStatus,
  useIncidentAlertDetail,
} from "@/features/alerts/store/incidentAlertsMockStore";
import type { IncidentWorkflowStatus } from "@/types/incident-alert";
import { cn } from "@/lib/utils";

function displayNameFromUser(user: AuthUser | null): string {
  if (!user) return "Utilisateur";
  const meta = user.user_metadata as { full_name?: string } | undefined;
  if (meta?.full_name && typeof meta.full_name === "string") return meta.full_name;
  if (user.email) return user.email.split("@")[0] ?? "Utilisateur";
  return "Utilisateur";
}

const STATUS_OPTIONS: { value: IncidentWorkflowStatus; label: string }[] = [
  { value: "NOUVEAU", label: "Nouveau" },
  { value: "EN_COURS", label: "En cours" },
  { value: "RESOLU", label: "Résolu" },
];

/**
 * Détail d’une alerte incident (mock session + actions locales).
 */
export default function IncidentAlertDetailPage() {
  const { alertId } = useParams<{ alertId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const alert = useIncidentAlertDetail(alertId);
  const [commentDraft, setCommentDraft] = useState("");
  const authorName = useMemo(() => displayNameFromUser(user), [user]);

  const assigneeSelectValue = alert?.assignee?.id ?? "none";

  const handleStatus = useCallback(
    (status: IncidentWorkflowStatus) => {
      if (!alertId) return;
      updateIncidentStatus(alertId, status);
      toast({
        title: "Statut mis à jour",
        description: `L’alerte est passée en « ${STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status} ».`,
      });
    },
    [alertId]
  );

  const handleAssignee = useCallback(
    (value: string) => {
      if (!alertId) return;
      assignIncident(alertId, resolveAssigneeById(value));
      toast({
        title: "Responsable mis à jour",
        description: "L’affectation a été enregistrée (session démo).",
      });
    },
    [alertId]
  );

  const handleComment = useCallback(() => {
    if (!alertId || !commentDraft.trim()) return;
    addIncidentComment(alertId, authorName, commentDraft);
    setCommentDraft("");
    toast({
      title: "Commentaire ajouté",
      description: "Visible dans l’historique de l’alerte.",
    });
  }, [alertId, authorName, commentDraft]);

  const handlePhotoLater = useCallback(() => {
    toast({
      title: "Bientôt disponible",
      description:
        "L’ajout de photo depuis l’app sera activé dans une prochaine version.",
    });
  }, []);

  if (!alert) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to={ROUTE_PATHS.dashboardAlerts}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux alertes
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Alerte introuvable ou hors jeu de démonstration.
          </CardContent>
        </Card>
      </div>
    );
  }

  const created = format(new Date(alert.createdAt), "d MMMM yyyy à HH:mm", {
    locale: fr,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-heading text-xl font-bold md:text-2xl line-clamp-2">
          {alert.title}
        </h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <IncidentSeverityBadge severity={alert.severity} />
        <IncidentStatusBadge status={alert.status} />
        <span className="text-muted-foreground self-center text-sm">
          {INCIDENT_KIND_LABELS[alert.kind]}
        </span>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Résumé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Véhicule : </span>
            <span className="font-medium">{alert.vehicleLabel}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Créée le : </span>
            {created}
          </p>
          <p className="text-foreground leading-relaxed">{alert.description}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle className="h-5 w-5 text-primary" aria-hidden />
            Responsable
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="assignee">Affectation</Label>
            <Select value={assigneeSelectValue} onValueChange={handleAssignee}>
              <SelectTrigger id="assignee">
                <SelectValue placeholder="Choisir un responsable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non assigné</SelectItem>
                {MOCK_INCIDENT_ASSIGNEES.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName} — {u.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Changer le statut</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={alert.status === value ? "default" : "outline"}
                className={cn(alert.status === value && "pointer-events-none")}
                onClick={() => handleStatus(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-5 w-5 text-primary" aria-hidden />
            Contacter
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {alert.driverContact && (
            <Button variant="outline" size="sm" asChild className="gap-2">
              <a href={`tel:${alert.driverContact.phone.replace(/\s/g, "")}`}>
                <Phone className="h-4 w-4" aria-hidden />
                Conducteur ({alert.driverContact.name})
              </a>
            </Button>
          )}
          {alert.technicianContact && (
            <Button variant="outline" size="sm" asChild className="gap-2">
              <a
                href={`tel:${alert.technicianContact.phone.replace(/\s/g, "")}`}
              >
                <Phone className="h-4 w-4" aria-hidden />
                Technicien / atelier ({alert.technicianContact.name})
              </a>
            </Button>
          )}
          {!alert.driverContact && !alert.technicianContact && (
            <p className="text-muted-foreground text-sm">
              Aucun contact téléphonique renseigné pour cette alerte.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-2"
          onClick={handlePhotoLater}
        >
          <Camera className="h-4 w-4" aria-hidden />
          Joindre une photo (bientôt)
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Paperclip className="h-5 w-5 text-muted-foreground" aria-hidden />
            Pièces jointes (simulation)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <IncidentAttachmentPlaceholder attachments={alert.attachments} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5 text-primary" aria-hidden />
            Historique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {alert.history.length === 0 ? (
              <li className="text-muted-foreground text-sm">Aucun événement.</li>
            ) : (
              [...alert.history]
                .sort(
                  (a, b) =>
                    new Date(b.at).getTime() - new Date(a.at).getTime()
                )
                .map((h) => (
                  <li
                    key={h.id}
                    className="border-l-2 border-border pl-3 text-sm"
                  >
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(h.at), "d MMM yyyy à HH:mm", {
                        locale: fr,
                      })}
                    </p>
                    <p className="font-medium">{h.label}</p>
                  </li>
                ))
            )}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
            Commentaires
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            {alert.comments.length === 0 ? (
              <li className="text-muted-foreground text-sm">
                Aucun commentaire pour l’instant.
              </li>
            ) : (
              alert.comments.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <p className="text-xs text-muted-foreground">
                    {c.authorName} ·{" "}
                    {format(new Date(c.createdAt), "d MMM yyyy à HH:mm", {
                      locale: fr,
                    })}
                  </p>
                  <p className="mt-1 text-sm">{c.body}</p>
                </li>
              ))
            )}
          </ul>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="comment">Ajouter un commentaire</Label>
            <Textarea
              id="comment"
              placeholder="Votre message…"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              rows={3}
            />
            <Button type="button" onClick={handleComment}>
              Publier le commentaire
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center pb-6">
        <Button variant="outline" asChild>
          <Link to={ROUTE_PATHS.dashboardAlerts}>Retour à la liste</Link>
        </Button>
      </div>
    </div>
  );
}
