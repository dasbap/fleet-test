import { Badge } from "@/components/ui/badge";
import { Camera } from "lucide-react";
import { useDeleteEvidence } from "@/hooks/useMaintenanceEvidence";
import { useEvidenceUpload, EVIDENCE_IMAGE_TYPES } from "@/hooks/useEvidenceUpload";
import { cn } from "@/lib/utils";
import EvidenceGrid from "./EvidenceGrid";
import EvidencePreviewCard from "./EvidencePreviewCard";

/**
 * Props du composant EvidenceUpload.
 * @param jobId - Identifiant du job de maintenance
 * @param kind - Type de preuve : 'before' (avant) ou 'after' (après)
 * @param existingEvidence - Liste des preuves déjà enregistrées pour ce job/kind
 * @param userId - Identifiant de l'utilisateur qui envoie la preuve
 * @param disabled - Désactive l'ajout et la suppression de preuves
 */
interface EvidenceUploadProps {
  jobId: string;
  kind: "before" | "after";
  existingEvidence: Array<{
    id: string;
    file_path: string;
    created_at: string;
  }>;
  userId: string;
  disabled?: boolean;
}

const EvidenceUpload = ({
  jobId,
  kind,
  existingEvidence,
  userId,
  disabled = false,
}: EvidenceUploadProps) => {
  const deleteMutation = useDeleteEvidence();
  const {
    fileInputRef,
    previewUrl,
    handleFileSelect,
    handleUpload,
    cancelPreview,
    handleUploadZoneKeyDown,
    isUploading,
    imageTypes,
  } = useEvidenceUpload({ jobId, kind, userId });

  const handleDelete = async (evidenceId: string, filePath: string) => {
    await deleteMutation.mutateAsync({
      id: evidenceId,
      file_path: filePath,
      job_id: jobId,
    });
  };

  const kindLabel = kind === "before" ? "Avant" : "Après";
  const kindColor =
    kind === "before"
      ? "bg-warning/10 text-warning border-warning/20"
      : "bg-success/10 text-success border-success/20";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className={kindColor}>
          Photos {kindLabel}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {existingEvidence.length} photo(s)
        </span>
      </div>

      <EvidenceGrid
        items={existingEvidence}
        kindLabel={kindLabel}
        disabled={disabled}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />

      {previewUrl && (
        <EvidencePreviewCard
          previewUrl={previewUrl}
          kindLabel={kindLabel}
          onUpload={handleUpload}
          onCancel={cancelPreview}
          isUploading={isUploading}
        />
      )}

      {!previewUrl && !disabled && (
        <div
          role="button"
          tabIndex={0}
          aria-label={`Ajouter une photo ${kindLabel.toLowerCase()}. Cliquez ou utilisez l'appareil photo.`}
          aria-disabled={isUploading}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            isUploading
              ? "cursor-not-allowed opacity-60 border-border"
              : "cursor-pointer hover:border-primary/50 hover:bg-primary/5 border-border"
          )}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          onKeyDown={handleUploadZoneKeyDown}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={imageTypes.join(",")}
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
            aria-hidden
          />
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-12 h-12 rounded-full bg-muted flex items-center justify-center"
              aria-hidden
            >
              <Camera className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              Ajouter une photo {kindLabel.toLowerCase()}
            </p>
            <p className="text-xs text-muted-foreground">
              Cliquez ou utilisez l'appareil photo
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceUpload;
export { EVIDENCE_IMAGE_TYPES };
