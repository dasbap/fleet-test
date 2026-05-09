import { FileText, Image as ImageIcon } from "lucide-react";
import type { IncidentAttachmentSimulated } from "@/types/incident-alert";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { cn } from "@/lib/utils";

interface IncidentAttachmentPlaceholderProps {
  attachments: IncidentAttachmentSimulated[];
  className?: string;
}

/**
 * Liste de pièces jointes simulées (métadonnées uniquement, pas de téléchargement réel).
 */
export function IncidentAttachmentPlaceholder({
  attachments,
  className,
}: IncidentAttachmentPlaceholderProps) {
  if (attachments.length === 0) {
    return (
      <p className={cn("text-muted-foreground text-sm", className)}>
        Aucune pièce jointe.
      </p>
    );
  }

  return (
    <ul className={cn("space-y-2", className)} role="list">
      {attachments.map((a) => (
        <li
          key={a.id}
          className="flex items-center gap-3 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-sm"
        >
          {a.localPreviewUrl ? (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-background">
              <img
                src={a.localPreviewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ) : a.mimeType.startsWith("image/") ? (
            <ImageIcon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{a.fileName}</p>
            <p className="text-muted-foreground text-xs">
              {a.mimeType} · {a.sizeLabel} ·{" "}
              {format(new Date(a.uploadedAt), "d MMM yyyy HH:mm", { locale: fr })}{" "}
              <span className="text-warning">(simulation)</span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
