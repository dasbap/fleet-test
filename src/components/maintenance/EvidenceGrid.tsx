import { Button } from "@/components/ui/button";
import { useSignedStorageUrl } from "@/hooks/useSignedStorageUrl";
import { X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface EvidenceItem {
  id: string;
  file_path: string;
  created_at: string;
}

interface EvidenceGridProps {
  /** Liste des preuves déjà enregistrées */
  items: EvidenceItem[];
  /** Libellé du type (ex. "Avant", "Après") pour les alt et aria-label */
  kindLabel: string;
  /** Masque le bouton de suppression */
  disabled?: boolean;
  /** Callback de suppression */
  onDelete: (evidenceId: string, filePath: string) => void;
  /** Désactive les boutons pendant une suppression */
  isDeleting?: boolean;
}

const MAINTENANCE_EVIDENCE_BUCKET = "maintenance-evidence";

function EvidenceGridItem({
  evidence,
  kindLabel,
  disabled,
  onDelete,
  isDeleting,
}: {
  evidence: EvidenceItem;
  kindLabel: string;
  disabled: boolean;
  onDelete: (evidenceId: string, filePath: string) => void;
  isDeleting: boolean;
}) {
  const { data: href, isLoading } = useSignedStorageUrl(
    MAINTENANCE_EVIDENCE_BUCKET,
    evidence.file_path,
  );

  return (
    <div className="relative group aspect-video w-full" role="listitem">
      {isLoading ? (
        <Skeleton className="h-full w-full rounded-lg" />
      ) : href ? (
        <img
          src={href}
          alt={`Preuve ${kindLabel}, enregistrée le ${new Date(evidence.created_at).toLocaleDateString("fr-FR")}`}
          className="w-full h-full object-cover rounded-lg border border-border"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-lg border border-border bg-muted/40 text-xs text-muted-foreground">
          Fichier indisponible
        </div>
      )}
      {!disabled && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onDelete(evidence.id, evidence.file_path)}
          disabled={isDeleting}
          aria-label={`Supprimer la preuve ${kindLabel}`}
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

/**
 * Grille d’affichage des preuves existantes avec bouton de suppression.
 * Réutilisable dans tout écran affichant des preuves maintenance.
 */
function EvidenceGrid({
  items,
  kindLabel,
  disabled = false,
  onDelete,
  isDeleting = false,
}: EvidenceGridProps) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3" role="list">
      {items.map((evidence) => (
        <EvidenceGridItem
          key={evidence.id}
          evidence={evidence}
          kindLabel={kindLabel}
          disabled={disabled}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      ))}
    </div>
  );
}

export default EvidenceGrid;
