import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Copy, Loader2, UserPlus } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreateFleetMemberAccount,
  useFleetMembers,
} from "@/hooks/useFleetMembers";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import type { RoleType } from "@/repositories/fleet-member.repository";

const memberAccountFormSchema = z.object({
  email: z.string().trim().email("Email invalide"),
  fullName: z
    .string()
    .trim()
    .min(2, "Le nom complet est requis")
    .max(120, "Le nom est trop long"),
  phone: z.string().trim().optional(),
  role: z
    .enum(["driver", "mechanic", "manager", "organizer"])
    .default("driver"),
});

type MemberAccountFormValues = z.infer<typeof memberAccountFormSchema>;

interface CreateInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fleetId: string;
  onSuccess?: () => void;
}

const roleLabels: Record<RoleType, string> = {
  organizer: "Organisateur",
  manager: "Gestionnaire",
  driver: "Chauffeur",
  mechanic: "Mécanicien",
};

const defaultFormValues = (): MemberAccountFormValues => ({
  email: "",
  fullName: "",
  phone: "",
  role: "driver",
});

export function CreateInvitationDialog({
  open,
  onOpenChange,
  fleetId,
  onSuccess,
}: CreateInvitationDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role } = useAuth();

  const createMemberAccount = useCreateFleetMemberAccount();

  const { data: fleetMembers = [] } = useFleetMembers(fleetId || undefined);

  const hasActiveOrganizer = fleetMembers.some(
    (member) => member.role === "organizer" && member.is_active
  );

  const [createdAccount, setCreatedAccount] = useState<{
    email: string;
    fullName: string;
    role: RoleType;
    tempPassword?: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  const form = useForm<MemberAccountFormValues>({
    resolver: zodResolver(memberAccountFormSchema),
    defaultValues: defaultFormValues(),
  });

  useEffect(() => {
    if (open && !fleetId) {
      toast({
        title: "Erreur",
        description:
          "Aucune flotte trouvée. Créez une flotte avant d'ajouter un compte membre.",
        variant: "destructive",
      });

      onOpenChange(false);
    }
  }, [fleetId, open, toast, onOpenChange]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      toast({
        title: "Mot de passe copié",
        description: "Le mot de passe temporaire a été copié.",
      });

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de copier le mot de passe.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: MemberAccountFormValues) => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour créer un compte membre.",
        variant: "destructive",
      });

      return;
    }

    if (values.role === "organizer" && hasActiveOrganizer) {
      toast({
        title: "Organisateur déjà défini",
        description: "Cette flotte possède déjà un organisateur actif.",
        variant: "destructive",
      });

      return;
    }

    try {
      const data = await createMemberAccount.mutateAsync({
        fleetId,
        data: {
          email: values.email,
          fullName: values.fullName,
          role: values.role,
          phone: values.phone || undefined,
        },
      });

      setCreatedAccount({
        email: values.email.trim().toLowerCase(),
        fullName: values.fullName.trim(),
        role: values.role,
        tempPassword: data.temp_password,
      });

      onSuccess?.();
    } catch {
      return;
    }
  };

  const isSubmitting = createMemberAccount.isPending;

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    form.reset(defaultFormValues());
    setCreatedAccount(null);
    setCopied(false);
    onOpenChange(false);
  };

  if (createdAccount) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-success" />
              Compte membre créé
            </DialogTitle>

            <DialogDescription>
              Le compte est rattaché à cette flotte. Remettez ces accès au
              membre.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border p-4 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Nom</span>

                <span className="text-right font-medium">
                  {createdAccount.fullName}
                </span>
              </div>

              <div className="mt-2 flex justify-between gap-3">
                <span className="text-muted-foreground">Email</span>

                <span className="text-right font-medium">
                  {createdAccount.email}
                </span>
              </div>

              <div className="mt-2 flex justify-between gap-3">
                <span className="text-muted-foreground">Rôle</span>

                <span className="font-medium">
                  {roleLabels[createdAccount.role]}
                </span>
              </div>
            </div>

            {createdAccount.tempPassword ? (
              <div className="space-y-2">
                <Label htmlFor="temporary-password">
                  Mot de passe temporaire
                </Label>

                <div className="flex items-center gap-2">
                  <Input
                    id="temporary-password"
                    value={createdAccount.tempPassword}
                    readOnly
                    className="font-mono text-base font-semibold"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      copyToClipboard(createdAccount.tempPassword ?? "")
                    }
                    aria-label="Copier le mot de passe temporaire"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreatedAccount(null);
                setCopied(false);
                form.reset(defaultFormValues());
              }}
            >
              Créer un autre compte
            </Button>

            <Button type="button" onClick={handleClose}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (!fleetId) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Créer une flotte d'abord
            </DialogTitle>

            <DialogDescription>
              Vous devez créer une flotte avant de créer des comptes membres.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-muted-foreground">
              {role === "organizer" || role === null
                ? "En tant qu'organisateur, créez votre première flotte pour ajouter des membres."
                : "Vous devez être membre d'une flotte avec un rôle autorisé pour créer des comptes."}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>

            {role === "organizer" || role === null ? (
              <Button
                type="button"
                onClick={() => {
                  handleClose();

                  navigate(ROUTE_PATHS.dashboardCreateFleet);
                }}
              >
                Créer une flotte
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Créer un compte membre
          </DialogTitle>

          <DialogDescription>
            Le compte sera créé directement sous cette flotte.
          </DialogDescription>
        </DialogHeader>

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
                      {...field}
                      autoComplete="name"
                      placeholder="Awa Njoh"
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>

                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      autoComplete="email"
                      placeholder="awa@example.com"
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>

                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="tel"
                      placeholder="+237699000000"
                    />
                  </FormControl>

                  <FormDescription>Optionnel.</FormDescription>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rôle</FormLabel>

                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      <SelectItem value="driver">Chauffeur</SelectItem>

                      <SelectItem value="mechanic">Mécanicien</SelectItem>

                      <SelectItem value="manager">Gestionnaire</SelectItem>

                      {!hasActiveOrganizer ? (
                        <SelectItem value="organizer">Organisateur</SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>

                  {hasActiveOrganizer ? (
                    <FormDescription>
                      Un organisateur actif existe déjà pour cette flotte.
                    </FormDescription>
                  ) : null}

                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Annuler
              </Button>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer le compte"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
