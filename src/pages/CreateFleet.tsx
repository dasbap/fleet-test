import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { mapSupabaseErrorToFrench } from "@/lib/mapSupabaseError";
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
  orgName: z.string().min(1, "Le nom de l'organisation est requis"),
  fleetName: z.string().min(1, "Le nom de la flotte est requis"),
  collectionPolicy: z.enum(["cash", "momo", "mix"], {
    required_error: "La politique de collecte est requise",
  }),
  countryCode: z.string().length(2, "Le code pays doit contenir 2 caractères").default("CM"),
});

type CreateFleetFormValues = z.infer<typeof createFleetSchema>;

const CreateFleet = () => {
  const { user, role, isLoading: authLoading, refreshMemberships } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<CreateFleetFormValues>({
    resolver: zodResolver(createFleetSchema),
    defaultValues: {
      orgName: "",
      fleetName: "",
      collectionPolicy: "mix",
      countryCode: "CM",
    },
  });

  // L'authentification est gérée par ProtectedRoute ; pas de redirect /auth ici.

  const createFleetMutation = useMutation<
    { orgId: string; fleetId: string },
    Error,
    CreateFleetFormValues
  >({
    mutationFn: async (values) => {
      console.log("[CreateFleet] mutation démarrée", { orgName: values.orgName, fleetName: values.fleetName });
      if (!user) {
        throw new Error("Utilisateur non connecté.");
      }

      // Vérifier si l'organisation existe déjà
      const { data: existingOrgs } = await supabase
        .from("organisations")
        .select("id")
        .eq("name", values.orgName)
        .limit(1);

      let orgId: string;
      if (Array.isArray(existingOrgs) && existingOrgs.length > 0) {
        orgId = existingOrgs[0].id as string;
      } else {
        // Création de l'organisation
        const { data: org, error: orgError } = await supabase
          .from("organisations")
          .insert({
            name: values.orgName,
            country_code: values.countryCode,
          })
          .select("id")
          .single();

        if (orgError || !org) {
          throw new Error(orgError?.message || "Impossible de créer l'organisation.");
        }
        orgId = org.id as string;
      }

      // Création de la flotte via la fonction RPC personnalisée (retourne un uuid)
      const { data: rawFleetId, error: fleetError } = await supabase.rpc(
        "creer_flotte_esamba",
        {
          p_org_id: orgId,
          p_name: values.fleetName,
          p_collection_policy: values.collectionPolicy,
        }
      );
      if (fleetError) {
        throw new Error(fleetError?.message || "Impossible de créer la flotte.");
      }
      const fleetId =
        typeof rawFleetId === "string"
          ? rawFleetId
          : (rawFleetId as { id?: string; fleet_id?: string } | null)?.id ??
            (rawFleetId as { id?: string; fleet_id?: string } | null)?.fleet_id ??
            null;
      if (!fleetId) {
        throw new Error("Impossible de créer la flotte (aucun identifiant retourné).");
      }

      // Ajout de l'utilisateur comme organizer dans l'équipe nouvellement créée
      const { error: membershipError } = await supabase.rpc(
        "creer_ou_mettre_a_jour_adhesion_flotte",
        {
          p_fleet_id: fleetId,
          p_user_id: user.id,
          p_role: "organizer",
          p_is_active: true,
        }
      );
      if (membershipError) {
        throw new Error(
          membershipError?.message || "Impossible de vous ajouter comme organizer de la flotte."
        );
      }

      console.log("[CreateFleet] mutation réussie", { orgId, fleetId });
      return { orgId, fleetId };
    },
    onSuccess: async (data) => {
      console.log("[CreateFleet] onSuccess appelé", { orgId: data.orgId, fleetId: data.fleetId });
      toast({
        title: "✅ Flotte créée avec succès",
        description:
          "Votre flotte a été créée et vous êtes maintenant organizer. Redirection en cours...",
      });

      // Invalidation des requêtes pour rafraîchir l'état côté React Query
      queryClient.invalidateQueries({ queryKey: ["fleet-members"] });
      queryClient.invalidateQueries({ queryKey: ["user-fleet"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      queryClient.invalidateQueries({ queryKey: ["fleet-vehicles-overview"] });

      // Rafraîchir les memberships puis laisser React appliquer l'état avant la navigation,
      // pour que le Dashboard voie bien la nouvelle flotte (userFleetId à jour).
      try {
        console.log("[CreateFleet] appel refreshMemberships()...");
        const members = await refreshMemberships();
        console.log("[CreateFleet] refreshMemberships() terminé", { count: members.length });
        // Court délai pour que le state useAuth soit commité avant le rendu du Dashboard
        await new Promise((r) => setTimeout(r, 80));
        navigate("/dashboard");
      } catch (error) {
        console.error(
          "[CreateFleet] ❌ Erreur lors du rafraîchissement des memberships après création de flotte:",
          error
        );
        window.location.href = "/dashboard";
      }
    },
    onError: (error) => {
      console.error("[CreateFleet] onError", { message: error.message, name: error.name });
      toast({
        title: "Erreur",
        description: mapSupabaseErrorToFrench(error.message),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (values: CreateFleetFormValues) => {
    createFleetMutation.mutate(values);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar userRole={role || "organizer"} />
        <SidebarInset className="flex flex-col flex-1">
          <DashboardHeader userRole={role || "organizer"} />
          <main className="flex-1 p-6 overflow-auto">
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
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default CreateFleet;
