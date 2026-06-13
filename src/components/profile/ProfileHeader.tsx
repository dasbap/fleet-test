import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Shield, Calendar } from "lucide-react";
import { getRoleLabel, getRoleBadgeClass } from "@/lib/roleUtils";
import type { AppRole } from "@/hooks/useAuth";
import type { User } from "@supabase/supabase-js";
import { useAvatarDisplayUrl } from "@/hooks/useAvatarDisplayUrl";

interface ProfileHeaderProps {
  user: User;
  role: AppRole | null;
  fullName: string;
  initials: string;
  createdAt: string;
}

/**
 * En-tête de la page profil : avatar, nom, email, rôle principal, date d'inscription.
 */
export default function ProfileHeader({
  user,
  role,
  fullName,
  initials,
  createdAt,
}: ProfileHeaderProps) {
  const userMetadata = user.user_metadata || {};
  const avatarSource =
    (userMetadata.avatar_path as string | undefined) ??
    (userMetadata.avatar_url as string | undefined);
  const { data: avatarDisplayUrl } = useAvatarDisplayUrl(avatarSource);

  return (
    <Card className="animate-fade-in border-border/80 shadow-sm">
      <CardContent className="pt-6 sm:pt-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-sm">
            <AvatarImage src={avatarDisplayUrl ?? undefined} />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-heading font-bold">{fullName}</h1>
            <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2 mt-1">
              <Mail className="h-4 w-4" />
              {user.email}
            </p>
            <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
              {role && (
                <Badge className={getRoleBadgeClass(role)}>
                  <Shield className="h-3 w-3 mr-1" />
                  {getRoleLabel(role)}
                </Badge>
              )}
              <Badge variant="outline">
                <Calendar className="h-3 w-3 mr-1" />
                Membre depuis {createdAt}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
