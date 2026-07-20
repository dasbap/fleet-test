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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCreateInvitation } from "@/hooks/useInvitations";
import { generateInvitationCode } from "@/lib/invitation-code";
import { ROUTE_PATHS } from "@/navigation/routePaths";

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

const defaultFormValues = (): InvitationFormValues => ({
  code: generateInvitationCode(),
  hasExpiration: false,
  expirationDays: 30,
  hasLimit: false,
  maxUses: 1,
});

export function CreateInvitationDialog({
  open,
  onOpenChange,
  fleetId,
  onSuccess,
}: CreateInvitationDialogProps) {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const createInvitation = useCreateInvitation();
  const [createdInvitation, setCreatedInvitation] = useState<{
    code: string;
    expiresAt: string | null;
    maxUses: number | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

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
    defaultValues: defaultFormValues(),
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
    } catch {
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

    const expiresAt =
      values.hasExpiration && values.expirationDays
        ? new Date(Date.now() + values.expirationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const maxUses = values.hasLimit && values.maxUses ? values.maxUses : null;

    try {
      const data = await createInvitation.mutateAsync({
        fleet_id: fleetId,
        code: values.code,
        expires_at: expiresAt,
        max_uses: maxUses,
      });

      setCreatedInvitation({
        code: data.code,
        expiresAt: data.expires_at,
        maxUses: data.max_uses,
      });

      onSuccess?.();
    } catch {
      // Erreur utilisateur gérée par useCreateInvitation (toast)
    }
  };

  const isSubmitting = createInvitation.isPending;

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset(defaultFormValues());
      setCreatedInvitation(null);
      setCopied(false);
      onOpenChange(false);
    }
  };

  if (createdInvitation) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-success" />
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
                    <Check className="h-4 w-4 text-success" />
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
                  ...defaultFormValues(),
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
              <Button
                type="button"
                onClick={() => {
                  handleClose();
                  window.location.href = ROUTE_PATHS.dashboardCreateFleet;
                }}
              >
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
