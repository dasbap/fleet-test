import { useState, useRef, useEffect } from "react";
import { useUploadEvidence } from "@/hooks/useMaintenanceEvidence";
import { toast } from "@/hooks/use-toast";

/** Taille max fichier (Mo) pour les preuves maintenance */
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** Types MIME acceptés pour les preuves photo */
export const EVIDENCE_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export interface UseEvidenceUploadParams {
  jobId: string;
  kind: "before" | "after";
  userId: string;
}

/**
 * Hook encapsulant la logique d’upload d’une preuve (sélection, aperçu, validation, envoi).
 * Utilisé par EvidenceUpload pour séparer logique métier et présentation.
 */
export function useEvidenceUpload({ jobId, kind, userId }: UseEvidenceUploadParams) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploadMutation = useUploadEvidence();

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const revokeAndClearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!EVIDENCE_IMAGE_TYPES.includes(file.type as (typeof EVIDENCE_IMAGE_TYPES)[number])) {
      toast({
        title: "Fichier non supporté",
        description: "Veuillez choisir une image (JPEG, PNG, WebP ou GIF).",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "Fichier trop volumineux",
        description: `Taille max : ${MAX_FILE_SIZE_MB} Mo.`,
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      await uploadMutation.mutateAsync({
        job_id: jobId,
        kind,
        file: selectedFile,
        created_by: userId,
      });
      revokeAndClearPreview();
    } catch {
      // Erreur déjà affichée par la mutation (toast)
    }
  };

  const cancelPreview = () => {
    revokeAndClearPreview();
  };

  const handleUploadZoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return {
    fileInputRef,
    previewUrl,
    selectedFile,
    handleFileSelect,
    handleUpload,
    cancelPreview,
    handleUploadZoneKeyDown,
    isUploading: uploadMutation.isPending,
    imageTypes: EVIDENCE_IMAGE_TYPES,
  };
}
