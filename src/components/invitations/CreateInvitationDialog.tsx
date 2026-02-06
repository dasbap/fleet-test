import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Ticket, Copy, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

const invitationFormSchema = z.object({
  code: z.string().min(3, "Le code doit contenir au moins 3 caractères").max(50, "Le code est trop long"),
  hasExpiration: z.boolean().default(false),
  expirationDays: z.coerce.number().min(1).max(365).optional(),
  hasLimit: z.boolean().default(false),
  maxUses: z.coerce.number().min(1).max(1000).optional(),
}).refine((data) => {
  if (data.hasExpiration && !data.expirationDays) {
    return false;
  }
  return true;
}, {
  message: "Veuillez spécifier le nombre de jours",
  path: ["expirationDays"],
}).refine((data) => {
  if (data.hasLimit && !data.maxUses) {
    return false;
  }
  return true;
}, {
  message: "Veuillez spécifier le nombre maximum d'utilisations",
  path: ["maxUses"],
});

type InvitationFormValues = z.infer<typeof invitationFormSchema>;

interface CreateInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fleetId: string;
  onSuccess?: () => void;
}

// Fonction pour générer un code d'invitation aléatoire
function generateInvitationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclut les caractères ambigus
  let code = "INV-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function CreateInvitationDialog({
  open,
  onOpenChange,
  fleetId,
  onSuccess,
}: CreateInvitationDialogProps) {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvitation, setCreatedInvitation] = useState<{
    code: string;
    expiresAt: string | null;
    maxUses: number | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Vérifier que fleetId est fourni quand le dialog s'ouvre
  useEffect(() => {
    if (open && !fleetId) {
      console.warn("CreateInvitationDialog: fleetId is missing");
      toast({
        title: "Erreur",
        description: "Aucune flotte trouvée. Veuillez vous assurer d'être membre d'une flotte.",
        variant: "destructive",
      });
      onOpenChange(false);
    }
  }, [fleetId, open, toast, onOpenChange]);

  const form = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationFormSchema),
    defaultValues: {
      code: generateInvitationCode(),
      hasExpiration: false,
      expirationDays: 30,
      hasLimit: false,
      maxUses: 1,
    },
  });

  const generateNewCode = () => {
    form.setValue("code", generateInvitationCode());
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Code copié",
        description: "Le code d'invitation a été copié dans le presse-papiers.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le code.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: InvitationFormValues) => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour créer une invitation.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculer la date d'expiration si nécessaire
      const expiresAt = values.hasExpiration && values.expirationDays
        ? new Date(Date.now() + values.expirationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Préparer les données
      const invitationData: {
        fleet_id: string;
        code: string;
        expires_at?: string | null;
        max_uses?: number | null;
        created_by: string;
      } = {
        fleet_id: fleetId,
        code: values.code.toUpperCase().trim(),
        created_by: user.id,
      };

      if (expiresAt) {
        invitationData.expires_at = expiresAt;
      } else {
        invitationData.expires_at = null;
      }

      if (values.hasLimit && values.maxUses) {
        invitationData.max_uses = values.maxUses;
      } else {
        invitationData.max_uses = null;
      }

      // Créer l'invitation
      const { data, error } = await supabase
        .from("flotte_invitations")
        .insert(invitationData)
        .select()
        .single();

      if (error) {
        console.error("Supabase error creating invitation:", error);
        if (error.code === "23505") {
          // Violation de contrainte unique (code déjà utilisé)
          throw new Error("Ce code d'invitation existe déjà. Veuillez en choisir un autre.");
        }
        if (error.message?.includes("row-level security")) {
          throw new Error("Vous n'avez pas les permissions pour créer une invitation. Assurez-vous d'être manager ou organizer de la flotte.");
        }
        throw new Error(error.message || "Impossible de créer l'invitation. Vérifiez vos permissions.");
      }

      // Afficher le résultat
      setCreatedInvitation({
        code: data.code,
        expiresAt: data.expires_at,
        maxUses: data.max_uses,
      });

      // Invalider les queries pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["invitations"] });

      toast({
        title: "Invitation créée",
        description: "L'invitation a été créée avec succès.",
      });

      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating invitation:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'invitation.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      setCreatedInvitation(null);
      setCopied(false);
      onOpenChange(false);
    }
  };

  // Si l'invitation a été créée, afficher le résultat
  if (createdInvitation) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-green-500" />
              Invitation créée avec succès
            </DialogTitle>
            <DialogDescription>
              Partagez ce code avec les personnes que vous souhaitez inviter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <FormLabel>Code d'invitation</FormLabel>
              <div className="flex items-center gap-2">
                <Input
                  value={createdInvitation.code}
                  readOnly
                  className="font-mono text-lg font-bold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(createdInvitation.code)}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {createdInvitation.expiresAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expire le :</span>
                  <span className="font-medium">
                    {new Date(createdInvitation.expiresAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              )}
              {createdInvitation.maxUses && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Utilisations max :</span>
                  <span className="font-medium">{createdInvitation.maxUses}</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreatedInvitation(null);
                form.reset({
                  code: generateInvitationCode(),
                  hasExpiration: false,
                  expirationDays: 30,
                  hasLimit: false,
                  maxUses: 1,
                });
              }}
            >
              Créer une autre invitation
            </Button>
            <Button type="button" onClick={handleClose}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Formulaire de création
  // Si pas de fleetId, proposer de créer une flotte pour les organisateurs
  if (!fleetId) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Créer une flotte d'abord
            </DialogTitle>
            <DialogDescription>
              Vous devez créer une flotte avant de pouvoir créer des invitations.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              {role === "organizer" || role === null
                ? "En tant qu'organisateur, créez votre première flotte pour commencer à inviter des membres."
                : "Vous devez être membre d'une flotte avec le rôle manager ou organizer pour créer des invitations."}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            {(role === "organizer" || role === null) && (
              <Button type="button" onClick={() => {
                handleClose();
                window.location.href = "/dashboard/create-fleet";
              }}>
                Créer une flotte
              </Button>
            )}
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
            <Ticket className="h-5 w-5" />
            Créer une invitation
          </DialogTitle>
          <DialogDescription>
            Créez un code d'invitation pour permettre à des chauffeurs de rejoindre votre flotte.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code d'invitation</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="INV-ABC123"
                        className="font-mono"
                        onChange={(e) => {
                          field.onChange(e.target.value.toUpperCase());
                        }}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={generateNewCode}
                      title="Générer un nouveau code"
                    >
                      <Ticket className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormDescription>
                    Le code sera automatiquement converti en majuscules.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hasExpiration"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Définir une expiration</FormLabel>
                    <FormDescription>
                      L'invitation expirera après un certain nombre de jours.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("hasExpiration") && (
              <FormField
                control={form.control}
                name="expirationDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de jours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        min={1}
                        max={365}
                        placeholder="30"
                      />
                    </FormControl>
                    <FormDescription>
                      L'invitation expirera dans {field.value || 30} jour(s).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="hasLimit"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Limiter le nombre d'utilisations</FormLabel>
                    <FormDescription>
                      L'invitation ne pourra être utilisée qu'un nombre limité de fois.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("hasLimit") && (
              <FormField
                control={form.control}
                name="maxUses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre maximum d'utilisations</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        min={1}
                        max={1000}
                        placeholder="1"
                      />
                    </FormControl>
                    <FormDescription>
                      L'invitation pourra être utilisée {field.value || 1} fois maximum.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                  "Créer l'invitation"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
