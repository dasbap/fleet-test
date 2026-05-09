import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import {
  ArrowLeft,
  Camera,
  MessageSquare,
  Paperclip,
  Share2,
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
import { useAlertDetail, useUpdateAlertStatus, useAssignAlert, useAlertComments, useAddAlertComment } from "@/hooks/useAlerts";
import type { IncidentWorkflowStatus } from "@/types/incident-alert";
import { cn } from "@/lib/utils";
import { shareContent, buildAlertDtoDocumentSharePayload } from "@/services/share.service";
import { useActivation } from "@/hooks/useActivation";

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
 * Détail d’une alerte incident (persistant via Supabase + actions statut/assignation/commentaires).
 */
export default function IncidentAlertDetailPage() {
  const { alertId } = useParams<{ alertId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: alertDto } = useAlertDetail(alertId);
  const { data: comments = [] } = useAlertComments(alertId);
  const { mutate: updateStatus, isLoading: isUpdatingStatus } = useUpdateAlertStatus();
  const { mutate: assignAlert, isLoading: isAssigning } = useAssignAlert();
  const { mutate: addComment, isLoading: isAddingComment } = useAddAlertComment(alertId);
  const { completeStep } = useActivation();
  const [commentDraft, setCommentDraft] = useState("");
  const authorName = useMemo(() => displayNameFromUser(user), [user]);

  const assigneeSelectValue = alertDto?.assignee_user_id ?? "none";

  const handleStatus = useCallback(
    (status: IncidentWorkflowStatus) => {
      if (!alertId) return;
      updateStatus({ alertId, status });
      if (status === "RESOLU") {
        void completeStep("first_alert");
      }
      toast({
        title: "Statut mis à jour",
        description: `L’alerte est passée en « ${STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status} ».`,
      });
    },
    [alertId, completeStep, updateStatus]
  );

  const handleAssignee = useCallback(
    (value: string) => {
      if (!alertId) return;
      const assigneeUserId = value === "none" ? null : value;
      assignAlert({ alertId, assigneeUserId });
      toast({
        title: "Responsable mis à jour",
        description: "L’affectation a été enregistrée.",
      });
    },
    [alertId, assignAlert]
  );

  const handleComment = useCallback(() => {
    if (!commentDraft.trim()) return;
    addComment(commentDraft, {
      onSuccess: () => {
        setCommentDraft("");
        toast({
          title: "Commentaire ajouté",
          description: "Visible dans l’historique de l’alerte.",
        });
      },
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : "Impossible d’ajouter le commentaire.";
        toast({
          title: "Erreur",
          description: message,
          variant: "destructive",
        });
      },
    });
  }, [addComment, commentDraft]);

  const handlePhotoLater = useCallback(() => {
    toast({
      title: "Bientôt disponible",
      description:
        "L’ajout de photo depuis l’app sera activé dans une prochaine version.",
    });
  }, []);

  const handleShare = useCallback(async () => {
    if (!alertDto || !alertId) return;
    const path = ROUTE_PATHS.dashboardAlertDetail(alertId);
    const rows = comments.map((c) => ({
      body: c.body,
      created_at: c.created_at,
      author_user_id: c.author_user_id,
    }));
    const payload = buildAlertDtoDocumentSharePayload(alertDto, path, rows);
    const { outcome } = await shareContent(payload);
    if (outcome === "shared") {
      toast({
        title: "Partage",
        description: "Le document peut être envoyé via le menu système.",
      });
    } else if (outcome === "copied") {
      toast({
        title: "Copié",
        description: "Le résumé a été copié dans le presse-papiers.",
      });
    } else if (outcome === "unavailable") {
      toast({
        title: "Partage indisponible",
        description: "Impossible d’ouvrir le partage sur cet appareil.",
        variant: "destructive",
      });
    }
  }, [alertDto, alertId, comments]);

  if (!alertDto) {
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

  const created = format(new Date(alertDto.created_at), "d MMMM yyyy à HH:mm", {
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
        <h1 className="font-heading min-w-0 flex-1 text-xl font-bold md:text-2xl line-clamp-2">
          {alertDto.message}
        </h1>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => void handleShare()}
          aria-label="Partager l’alerte"
        >
          <Share2 className="h-5 w-5" aria-hidden />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <IncidentSeverityBadge severity={alertDto.severity as "critical" | "high" | "medium" | "low"} />
        <IncidentStatusBadge status={alertDto.status} />
        <span className="text-muted-foreground self-center text-sm">
          {INCIDENT_KIND_LABELS["maintenance_due"]}
        </span>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Résumé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Véhicule : </span>
            <span className="font-medium">{alertDto.vehicle_id ?? "—"}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Créée le : </span>
            {created}
          </p>
          <p className="text-foreground leading-relaxed">{alertDto.message}</p>
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
                variant={alertDto.status === value ? "default" : "outline"}
                className={cn(alertDto.status === value && "pointer-events-none")}
                onClick={() => handleStatus(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contacts détaillés non disponibles dans le modèle persistant actuel */}

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
          <IncidentAttachmentPlaceholder attachments={[]} />
        </CardContent>
      </Card>

      {/* Historique détaillé non encore implémenté côté persistance */}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
            Commentaires
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            {comments.length === 0 ? (
              <li className="text-muted-foreground text-sm">
                Aucun commentaire pour l’instant.
              </li>
            ) : (
              comments.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <p className="text-xs text-muted-foreground">
                    {c.author_user_id ?? "Utilisateur"} ·{" "}
                    {format(new Date(c.created_at), "d MMM yyyy à HH:mm", {
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
            <Button type="button" onClick={handleComment} disabled={isAddingComment}>
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
