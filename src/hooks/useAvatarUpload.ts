import { useCallback, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { mapSupabaseErrorToFrench } from "@/lib/mapSupabaseError";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 Mo

interface UseAvatarUploadOptions {
  onAvatarUpdated?: (url: string) => void;
}

/**
 * Hook pour gérer l'upload de l'avatar utilisateur.
 * - Valide le fichier (type, taille)
 * - Téléverse dans le bucket Storage `avatars`
 * - Met à jour le profil Auth avec l'URL publique
 */
export function useAvatarUpload(
  user: User,
  options?: UseAvatarUploadOptions
) {
  const [isUploading, setIsUploading] = useState(false);
  const onAvatarUpdated = options?.onAvatarUpdated;

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!file) {
        return;
      }

      // Vérification du type de fichier
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner une image valide",
          variant: "destructive",
        });
        return;
      }

      // Vérification de la taille (max 2 Mo)
      if (file.size > MAX_AVATAR_SIZE_BYTES) {
        toast({
          title: "Erreur",
          description: "L'image ne doit pas dépasser 2 Mo",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);

      try {
        const fileExt = file.name.split(".").pop() || "jpg";
        const fileName = `avatar.${fileExt}`;
        // Respecte la convention `{user_id}/avatar.ext` pour les policies Storage
        const filePath = `${user.id}/${fileName}`;

        // Téléversement vers Storage Supabase
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        // Récupération de l'URL publique
        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        const newAvatarUrl = publicUrlData.publicUrl;

        if (!newAvatarUrl) {
          throw new Error("URL introuvable après l'upload");
        }

        // Mise à jour du profil Supabase Auth
        const { error: updateError } = await supabase.auth.updateUser({
          data: { avatar_url: newAvatarUrl },
        });

        if (updateError) {
          throw updateError;
        }

        onAvatarUpdated?.(newAvatarUrl);

        toast({
          title: "Succès",
          description: "Votre photo de profil a été mise à jour",
        });
      } catch (error: unknown) {
        // eslint-disable-next-line no-console
        console.error("Erreur lors de l'upload avatar :", error);
        const rawMessage =
          error instanceof Error ? error.message : undefined;
        const description = rawMessage
          ? mapSupabaseErrorToFrench(rawMessage)
          : "Impossible de télécharger l'image";

        toast({
          title: "Erreur",
          description: description,
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [onAvatarUpdated, user.id]
  );

  return { isUploading, uploadAvatar };
}

