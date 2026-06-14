import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { ProfileService } from "@/services/profile.service";
import { ProfileRepository } from "@/repositories/profile.repository";
import { mapSupabaseErrorToFrench } from "@/lib/mapSupabaseError";

const profileRepository = new ProfileRepository();
const profileService = new ProfileService(profileRepository);

export interface UpdateProfileFullNameInput {
  userId: string;
  fullName: string;
}

export function useUpdateProfileFullName() {
  return useMutation({
    mutationFn: ({ userId, fullName }: UpdateProfileFullNameInput) =>
      profileService.updateProfileFullName(userId, fullName),
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Votre profil a été mis à jour",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: mapSupabaseErrorToFrench(error.message),
        variant: "destructive",
      });
    },
  });
}
