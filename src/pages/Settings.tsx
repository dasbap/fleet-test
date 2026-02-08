import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useEsambaDataVerification } from "@/hooks/useEsambaDataVerification";
import { useFleetMembers, type FleetMember } from "@/hooks/useFleetMembers";
import { Settings as SettingsIcon, Zap, CheckCircle2, XCircle, RefreshCw, Users, Shield, UserCog, Car, Wrench, Phone, Loader2 } from "lucide-react";

interface SeedResult {
  orgId: string;
  fleetId: string;
  vehicleId: string;
  invitationCode: string;
}

const Settings = () => {
  const { user, role, userFleetId, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: verificationStatus, isLoading: isVerifying, refetch: refetchVerification } = useEsambaDataVerification();
  const { data: fleetMembers = [], isLoading: isLoadingMembers, error: membersError, refetch: refetchMembers } = useFleetMembers(userFleetId || undefined);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  const seedMutation = useMutation<SeedResult, Error>({
    mutationFn: async () => {
      if (!user) {
        throw new Error("Utilisateur non connecté.");
      }

      // Vérifier si l'organisation existe déjà
      const { data: existingOrgs } = await supabase
        .from("organisations")
        .select("id")
        .eq("name", "Organisation ESAMBA")
        .limit(1);

      let orgId: string;
      if (existingOrgs && existingOrgs.length > 0) {
        orgId = existingOrgs[0].id as string;
      } else {
        // Créer l'organisation si elle n'existe pas
        const { data: org, error: orgError } = await supabase
          .from("organisations")
          .insert({
            name: "Organisation ESAMBA",
            country_code: "CM",
          })
          .select("id")
          .single();

        if (orgError || !org) {
          throw new Error(orgError?.message || "Impossible de créer l'organisation.");
        }
        orgId = org.id as string;
      }

      // 2) Flotte ESAMBA
      // Utilisation d'une fonction RPC pour contourner les problèmes RLS
      const { data: fleetId, error: fleetError } = await supabase.rpc(
        "creer_flotte_esamba",
        {
          p_org_id: orgId,
          p_name: "Flotte ESAMBA",
          p_collection_policy: "mix",
        }
      );

      if (fleetError || !fleetId) {
        throw new Error(
          fleetError?.message || "Impossible de créer la flotte."
        );
      }

      // 3) Membership organisateur pour l'utilisateur courant
      // Utilisation d'une fonction RPC pour gérer l'UPSERT de manière atomique
      // Cela évite les erreurs de contrainte unique et les race conditions
      const { data: membershipId, error: membershipError } = await supabase.rpc(
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
          membershipError.message || "Impossible de créer ou mettre à jour le membership."
        );
      }

      // 4) Véhicule de démo
      // Utilisation d'une fonction RPC pour contourner les problèmes RLS
      // Le membership vient d'être créé, mais il peut y avoir un délai de propagation
      const { data: vehicleId, error: vehicleError } = await supabase.rpc(
        "creer_vehicule_esamba",
        {
          p_fleet_id: fleetId,
          p_registration: "ESAMBA-001",
          p_brand: "Toyota",
          p_model: "Corolla",
          p_year: 2020,
          p_current_km: 0,
        }
      );

      if (vehicleError || !vehicleId) {
        throw new Error(
          vehicleError?.message || "Impossible de créer le véhicule."
        );
      }

      // 5) Invitation ESAMBA-2024
      // Utilisation d'une fonction RPC pour contourner les problèmes RLS
      const { data: invitationCode, error: invitationError } = await supabase.rpc(
        "creer_invitation_esamba",
        {
          p_fleet_id: fleetId,
          p_code: "ESAMBA-2024",
        }
      );

      if (invitationError || !invitationCode) {
        throw new Error(
          invitationError?.message || "Impossible de créer l'invitation."
        );
      }

      return {
        orgId,
        fleetId,
        vehicleId: vehicleId as string,
        invitationCode,
      };
    },
    onSuccess: (result) => {
      // Rafraîchir la vérification après création
      queryClient.invalidateQueries({ queryKey: ["esamba-data-verification"] });
      
      console.log("✅ Données ESAMBA vérifiées/créées:", result);
      toast({
        title: "✅ Données ESAMBA prêtes",
        description: `Organisation, flotte, véhicule et invitation ${result.invitationCode} sont disponibles.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Note: L'exécution automatique a été désactivée pour éviter les problèmes
  // L'utilisateur doit cliquer manuellement sur le bouton "Créer les données ESAMBA-2024"

  // Fonctions helper pour les rôles
  const getRoleLabel = (role: string) => {
    switch (role) {
      case "organizer":
        return "Organisateur";
      case "manager":
        return "Gestionnaire";
      case "driver":
        return "Chauffeur";
      case "mechanic":
        return "Mécanicien";
      default:
        return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "organizer":
        return <Shield className="h-4 w-4" />;
      case "manager":
        return <UserCog className="h-4 w-4" />;
      case "driver":
        return <Car className="h-4 w-4" />;
      case "mechanic":
        return <Wrench className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "organizer":
        return "default";
      case "manager":
        return "secondary";
      case "driver":
        return "outline";
      case "mechanic":
        return "outline";
      default:
        return "outline";
    }
  };

  // Grouper les membres par user_id pour afficher tous leurs rôles
  const groupedMembers = useMemo(() => {
    const grouped = new Map<string, { profile: FleetMember['profile']; roles: Array<{ role: string; is_active: boolean; id: string }> }>();
    
    fleetMembers.forEach((member) => {
      if (!grouped.has(member.user_id)) {
        grouped.set(member.user_id, {
          profile: member.profile,
          roles: [],
        });
      }
      const userData = grouped.get(member.user_id)!;
      userData.roles.push({
        role: member.role,
        is_active: member.is_active,
        id: member.id,
      });
    });
    
    return Array.from(grouped.entries()).map(([user_id, data]) => ({
      user_id,
      ...data,
    }));
  }, [fleetMembers]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const userRole = role || "organizer";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar userRole={userRole} />
        <SidebarInset className="flex flex-col flex-1">
          <DashboardHeader userRole={userRole} />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
                    <SettingsIcon className="h-7 w-7" />
                    Paramètres
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Outils d&apos;administration et configuration de votre espace E-Samba.
                  </p>
                </div>
              </div>

              {/* Carte de seed ESAMBA */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Données de démo ESAMBA
                  </CardTitle>
                  <CardDescription>
                    Crée automatiquement une organisation, une flotte, un véhicule et une invitation
                    <span className="font-mono font-semibold"> ESAMBA-2024</span> dans votre base.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertTitle>Ce que fait ce bouton</AlertTitle>
                    <AlertDescription>
                      - Crée <strong>Organisation ESAMBA</strong> et <strong>Flotte ESAMBA</strong>
                      <br />
                      - Vous ajoute comme <strong>organisateur</strong> de cette flotte
                      <br />
                      - Ajoute un véhicule <strong>ESAMBA-001</strong>
                      <br />
                      - Crée l&apos;invitation <strong>ESAMBA-2024</strong>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    {seedMutation.isLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                        Création automatique en cours...
                      </div>
                    )}
                    {seedMutation.isSuccess && (
                      <div className="text-sm text-success font-medium">
                        ✅ Données ESAMBA créées avec succès
                      </div>
                    )}
                    <Button
                      onClick={() => seedMutation.mutate()}
                      disabled={seedMutation.isLoading}
                      variant={seedMutation.isSuccess ? "outline" : "default"}
                      className="w-full"
                    >
                      {seedMutation.isLoading 
                        ? "Création en cours..." 
                        : seedMutation.isSuccess
                        ? "Recréer les données ESAMBA-2024"
                        : "Créer les données ESAMBA-2024"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Carte de vérification des données */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <CardTitle>Vérification des données</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchVerification()}
                      disabled={isVerifying}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isVerifying ? "animate-spin" : ""}`} />
                      Actualiser
                    </Button>
                  </div>
                  <CardDescription>
                    Vérifiez que toutes les données ESAMBA ont été créées dans votre base
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Organisation ESAMBA */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">Organisation ESAMBA</span>
                    {isVerifying ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    ) : verificationStatus?.organisation ? (
                      <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Créée
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Absente
                      </Badge>
                    )}
                  </div>

                  {/* Flotte ESAMBA */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">Flotte ESAMBA</span>
                    {isVerifying ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    ) : verificationStatus?.flotte ? (
                      <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Créée
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Absente
                      </Badge>
                    )}
                  </div>

                  {/* Membership Organizer */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">Membership Organizer</span>
                    {isVerifying ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    ) : verificationStatus?.membership_organizer ? (
                      <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Créé
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Absent
                      </Badge>
                    )}
                  </div>

                  {/* Véhicule ESAMBA-001 */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">Véhicule ESAMBA-001</span>
                    {isVerifying ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    ) : verificationStatus?.vehicule_esamba_001 ? (
                      <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Créé
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Absent
                      </Badge>
                    )}
                  </div>

                  {/* Invitation ESAMBA-2024 */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">Invitation ESAMBA-2024</span>
                    {isVerifying ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    ) : verificationStatus?.invitation_esamba_2024 ? (
                      <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Créée
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Absente
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Carte Mon espace organisateur */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <CardTitle>Mon espace organisateur</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchMembers()}
                      disabled={isLoadingMembers}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingMembers ? "animate-spin" : ""}`} />
                      Actualiser
                    </Button>
                  </div>
                  <CardDescription>
                    Liste de tous les profils et leurs rôles dans votre flotte
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!userFleetId ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-muted-foreground mb-4">
                        Créez une flotte pour commencer à gérer votre équipe.
                      </p>
                      <Button onClick={() => navigate("/dashboard/create-fleet")}>
                        Créer une flotte
                      </Button>
                    </div>
                  ) : isLoadingMembers ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Chargement des profils...</p>
                      </div>
                    </div>
                  ) : membersError ? (
                    <Alert variant="destructive">
                      <AlertTitle>Erreur de chargement</AlertTitle>
                      <AlertDescription>
                        {membersError.message || "Impossible de charger les profils. Veuillez réessayer."}
                      </AlertDescription>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchMembers()}
                        className="mt-4"
                      >
                        Réessayer
                      </Button>
                    </Alert>
                  ) : groupedMembers.length === 0 ? (
                    <Alert>
                      <AlertTitle>Aucun membre trouvé</AlertTitle>
                      <AlertDescription>
                        Aucun profil n&apos;a encore été ajouté à votre flotte. Utilisez la page Équipes pour ajouter des membres.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      {groupedMembers.map((member) => (
                        <div
                          key={member.user_id}
                          className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
                                {member.profile?.full_name?.[0]?.toUpperCase() || "?"}
                              </div>
                              <div>
                                <h4 className="font-semibold">
                                  {member.profile?.full_name || "Sans nom"}
                                </h4>
                                {member.profile?.phone && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    <span>{member.profile.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 ml-12">
                              {member.roles
                                .filter((r) => r.is_active)
                                .map((roleData) => (
                                  <Badge
                                    key={`${member.user_id}-${roleData.role}-${roleData.id}`}
                                    variant={getRoleBadgeVariant(roleData.role)}
                                    className="flex items-center gap-1"
                                  >
                                    {getRoleIcon(roleData.role)}
                                    {getRoleLabel(roleData.role)}
                                  </Badge>
                                ))}
                              {member.roles.filter((r) => !r.is_active).length > 0 && (
                                <Badge variant="outline" className="text-muted-foreground">
                                  {member.roles.filter((r) => !r.is_active).length} rôle(s) inactif(s)
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="text-sm text-muted-foreground pt-2 border-t">
                        Total : {groupedMembers.length} profil{groupedMembers.length > 1 ? "s" : ""} dans votre flotte
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Settings;

