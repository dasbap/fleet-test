import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useCreateFleet } from "@/hooks/useCreateFleet";
import { PageLoader } from "@/components/dashboard/PageLoader";
import {
  Loader2,
  Building2,
  Truck,
  Globe,
  Wallet,
  LogOut,
} from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signOut } from "@/lib/auth-actions";

const createFleetSchema = z.object({
  orgName: z
    .string()
    .trim()
    .min(1, "Le nom de l'organisation est requis"),
  fleetName: z
    .string()
    .trim()
    .min(1, "Le nom de la flotte est requis"),
  collectionPolicy: z.enum(["cash", "momo", "mix"], {
    required_error: "La politique de collecte est requise",
  }),
  countryCode: z
    .string()
    .trim()
    .length(2, "Le code pays doit contenir 2 caractères")
    .default("CM"),
});

type CreateFleetFormValues = z.infer<typeof createFleetSchema>;

const CreateFleet = () => {
  const { isLoading: authLoading, refreshMemberships } = useAuth();
  const navigate = useNavigate();

  const form = useForm<CreateFleetFormValues>({
    resolver: zodResolver(createFleetSchema),
    defaultValues: {
      orgName: "",
      fleetName: "",
      collectionPolicy: "mix",
      countryCode: "CM",
    },
  });

  const createFleetMutation = useCreateFleet({
    onSuccess: async () => {
      try {
        await refreshMemberships();
        await new Promise((r) => setTimeout(r, 80));
        navigate("/dashboard");
      } catch (error) {
        console.error("Erreur refreshMemberships après création flotte:", error);
        window.location.href = "/dashboard";
      }
    },
  });

  const handleSubmit = (values: CreateFleetFormValues) => {
    createFleetMutation.mutate(values);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  if (authLoading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-surface-overlay flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto">
            <Truck className="w-8 h-8 text-brand" />
          </div>
          <h1 className="text-2xl font-heading font-semibold">Créez votre flotte</h1>
          <p className="text-sm text-muted-foreground">
            Vous n&apos;êtes rattaché à aucune flotte active.
            <br />
            Créez votre organisation pour commencer.
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="orgName"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel
                    htmlFor="create-fleet-org"
                    className="flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4 shrink-0" />
                    Nom de l&apos;organisation
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="create-fleet-org"
                      placeholder="Transport Douala Express"
                      autoFocus
                      {...field}
                      disabled={createFleetMutation.isPending}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Votre entreprise, coopérative ou association.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="countryCode"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel
                    htmlFor="create-fleet-country"
                    className="flex items-center gap-2"
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    Code pays
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="create-fleet-country"
                      placeholder="CM"
                      maxLength={2}
                      className="uppercase"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.toUpperCase())
                      }
                      disabled={createFleetMutation.isPending}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    ISO à 2 lettres (ex. CM pour Cameroun).
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fleetName"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel
                    htmlFor="create-fleet-name"
                    className="flex items-center gap-2"
                  >
                    <Truck className="w-4 h-4 shrink-0" />
                    Nom de la flotte
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="create-fleet-name"
                      placeholder="Flotte principale"
                      {...field}
                      disabled={createFleetMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="collectionPolicy"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 shrink-0" />
                    Politique de collecte
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={createFleetMutation.isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une politique" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Espèces uniquement</SelectItem>
                      <SelectItem value="momo">Mobile Money uniquement</SelectItem>
                      <SelectItem value="mix">
                        Mixte (espèces + Mobile Money)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Comment les paiements sont collectés dans cette flotte.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-xs text-muted-foreground pt-1 border-t border-border/60">
              Vous serez ajouté comme <strong className="text-foreground font-medium">organisateur</strong>{" "}
              de la flotte. Vous pourrez inviter l&apos;équipe et gérer les véhicules depuis le tableau de bord.
            </p>

            <Button
              type="submit"
              disabled={
                createFleetMutation.isPending || !form.watch("orgName")?.trim()
              }
              className="w-full bg-brand hover:bg-brand-dark text-white gap-2"
            >
              {createFleetMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {createFleetMutation.isPending
                ? "Création en cours…"
                : "Créer et accéder au dashboard"}
            </Button>
          </form>
        </Form>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mx-auto transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default CreateFleet;
