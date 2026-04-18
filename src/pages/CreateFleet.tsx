import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, ArrowLeft, Building2, Users } from "lucide-react";
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
  const { role, isLoading: authLoading, refreshMemberships } = useAuth();
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

  if (authLoading) {
    return <PageLoader />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
              {/* En-tête */}
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-heading font-bold">
                    Créer une flotte
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Créez une nouvelle organisation et flotte pour commencer
                  </p>
                </div>
              </div>

              {/* Carte Formulaire */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Informations de l'organisation et de la flotte
                  </CardTitle>
                  <CardDescription>
                    Remplissez les informations ci-dessous pour créer votre flotte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                      {/* Nom de l'organisation */}
                      <FormField
                        control={form.control}
                        name="orgName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom de l'organisation</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: Mon Entreprise"
                                {...field}
                                disabled={createFleetMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Code pays */}
                      <FormField
                        control={form.control}
                        name="countryCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Code pays</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="CM"
                                maxLength={2}
                                {...field}
                                disabled={createFleetMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-sm text-muted-foreground">
                              Code ISO à 2 lettres (ex: CM pour Cameroun)
                            </p>
                          </FormItem>
                        )}
                      />

                      {/* Nom de la flotte */}
                      <FormField
                        control={form.control}
                        name="fleetName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom de la flotte</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: Flotte Principale"
                                {...field}
                                disabled={createFleetMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Politique de collecte */}
                      <FormField
                        control={form.control}
                        name="collectionPolicy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Politique de collecte</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={createFleetMutation.isPending}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner une politique" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="cash">Espèces uniquement</SelectItem>
                                <SelectItem value="momo">Mobile Money uniquement</SelectItem>
                                <SelectItem value="mix">Mixte (Espèces + Mobile Money)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                            <p className="text-sm text-muted-foreground">
                              Détermine comment les paiements sont collectés dans cette flotte
                            </p>
                          </FormItem>
                        )}
                      />

                      {/* Boutons du formulaire */}
                      <div className="flex gap-4 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate("/dashboard")}
                          disabled={createFleetMutation.isPending}
                          className="flex-1"
                        >
                          Annuler
                        </Button>
                        <Button
                          type="submit"
                          disabled={createFleetMutation.isPending}
                          className="flex-1"
                        >
                          {createFleetMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Création en cours...
                            </>
                          ) : (
                            <>
                              <Users className="mr-2 h-4 w-4" />
                              Créer la flotte
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Carte d'info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">À propos de la création de flotte</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    • Vous serez automatiquement ajouté comme <strong>organizer</strong> de la flotte
                  </p>
                  <p>
                    • En tant qu'organizer, vous pourrez gérer les membres, les véhicules et les invitations
                  </p>
                  <p>
                    • Si l'organisation existe déjà, elle sera réutilisée. Sinon, une nouvelle organisation sera créée
                  </p>
                </CardContent>
              </Card>
    </div>
  );
};

export default CreateFleet;
