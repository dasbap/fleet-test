import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProfileCardProps {
  displayName: string;
  email: string | null;
  initials: string;
  className?: string;
}

/**
 * En-tête profil utilisateur (nom, email, avatar).
 */
export function ProfileCard({
  displayName,
  email,
  initials,
  className,
}: ProfileCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="flex items-center gap-4 p-4">
        <Avatar className="h-14 w-14 border border-border">
          <AvatarFallback className="bg-primary/10 font-heading text-lg text-primary">
            {initials.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-heading truncate text-lg font-semibold">{displayName}</p>
          {email && (
            <p className="text-muted-foreground truncate text-sm">{email}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
