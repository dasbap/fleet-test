import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import type { AuthUser } from "@/types/auth";
import { useUpdateProfileFullName } from "@/hooks/useUpdateProfileFullName";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { useAvatarDisplayUrl } from "@/hooks/useAvatarDisplayUrl";

const profileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(50, "Le nom ne doit pas dépasser 50 caractères"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileEditFormProps {
  user: AuthUser;
  onUpdate: () => void;
}

const ProfileEditForm = ({ user, onUpdate }: ProfileEditFormProps) => {
  const updateProfile = useUpdateProfileFullName();
  const metadataAvatar =
    (user.user_metadata?.avatar_url as string | undefined) ?? null;
  const [freshSignedAvatarUrl, setFreshSignedAvatarUrl] = useState<string | null>(
    null,
  );
  const { data: resolvedAvatarUrl } = useAvatarDisplayUrl(
    freshSignedAvatarUrl ? undefined : metadataAvatar,
  );
  const avatarDisplaySrc = freshSignedAvatarUrl ?? resolvedAvatarUrl ?? undefined;

  const { isUploading: isUploadingAvatar, uploadAvatar } = useAvatarUpload(
    user,
    {
      onAvatarUpdated: (url) => {
        setFreshSignedAvatarUrl(url);
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
      .map((n: string) => n[0] || "")
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  useEffect(() => {
    setFreshSignedAvatarUrl(null);
  }, [user.id, metadataAvatar]);

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
    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        fullName: values.fullName,
      });
      onUpdate();
      form.reset({ fullName: values.fullName });
    } catch {
      // Toast géré par useUpdateProfileFullName
    }
  };

  const isLoading = updateProfile.isPending;

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
              <AvatarImage src={avatarDisplaySrc} />
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
