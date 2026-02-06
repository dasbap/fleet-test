import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Camera, Save } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { mapSupabaseErrorToFrench } from "@/lib/mapSupabaseError";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";

const profileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(50, "Le nom ne doit pas dépasser 50 caractères"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileEditFormProps {
  user: User;
  onUpdate: () => void;
}

// Vérifie la validité d'une URL (sécuriser l'affichage)
const sanitizeUrl = (url: string | null): string | undefined => {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    // Autoriser seulement http/https
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return url;
    }
  } catch {
    return undefined;
  }
  return undefined;
};

const ProfileEditForm = ({ user, onUpdate }: ProfileEditFormProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user.user_metadata?.avatar_url || null
  );

  const { isUploading: isUploadingAvatar, uploadAvatar } = useAvatarUpload(
    user,
    {
      onAvatarUpdated: (url) => {
        setAvatarUrl(url);
        onUpdate();
      },
    }
  );

  // Préférence pour la clé utilisée côté back (full_name, cf. profil supabase)
  const userMetadata = user.user_metadata || {};
  const currentFullName =
    userMetadata.full_name || (user.email ? user.email.split("@")[0] : "");

  const initials =
    currentFullName
      .trim()
      .split(" ")
      .map((n) => n[0] || "")
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  // Resynchroniser l'URL de l'avatar lorsque le user change (ex. après refreshUser)
  useEffect(() => {
    const meta = user.user_metadata || {};
    setAvatarUrl(meta.avatar_url || null);
  }, [user]);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: currentFullName,
    },
  });

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    void uploadAvatar(file);
  };

  const onSubmit = async (values: ProfileFormValues) => {
    setIsLoading(true);

    try {
      // Validation par le schéma zod déjà assurée côté react-hook-form

      const { error } = await supabase.auth.updateUser({
        data: { full_name: values.fullName },
      });

      if (error) {
        throw error;
      }

      // Synchroniser également la table profils pour assurer la cohérence métier
      const { error: profileError } = await supabase
        .from("profils")
        .update({ full_name: values.fullName })
        .eq("user_id", user.id);

      if (profileError) {
        // eslint-disable-next-line no-console
        console.error(
          "Erreur lors de la mise à jour du profil (table profils) :",
          profileError
        );
      }

      toast({
        title: "Succès",
        description: "Votre profil a été mis à jour",
      });
      onUpdate();
      form.reset({ fullName: values.fullName });
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("Erreur lors de la mise à jour profil :", error);
      const rawMessage =
        error instanceof Error ? error.message : undefined;
      toast({
        title: "Erreur",
        description:
          rawMessage
            ? mapSupabaseErrorToFrench(rawMessage)
            : "Impossible de mettre à jour le profil",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>Modifier le profil</CardTitle>
        <CardDescription>
          Mettez à jour vos informations personnelles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Modification de l’avatar */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              <AvatarImage src={sanitizeUrl(avatarUrl)} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
            >
              {isUploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={isUploadingAvatar}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Cliquez sur l&apos;icône pour changer votre photo
          </p>
        </div>

        {/* Formulaire nom */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Entrez votre nom"
                      {...field}
                      autoComplete="off"
                      maxLength={50}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="pt-2">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2">Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span className="ml-2">Enregistrer les modifications</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Email (lecture seule) */}
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-2">Adresse e-mail</p>
          <p className="text-sm font-medium">{user.email}</p>
          <p className="text-xs text-muted-foreground mt-1">
            L&apos;adresse e-mail ne peut pas être modifiée
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileEditForm;
