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
import { Loader2, Building2, Truck, Globe, Wallet, LogOut, User, Phone, BadgeCheck } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

const createFleetSchema = z.object({
  fullName: z.string().trim().min(1, "Le nom complet est requis"),
  phone: z.string().trim().min(1, "Le téléphone est requis"),
  orgName: z.string().trim().min(1, "Le nom de l'organisation est requis"),
  companyIdentifier: z.string().trim().min(1, "L'identifiant entreprise est requis"),
  countryCode: z.string().trim().length(2, "Le code pays doit contenir 2 caractères"),
  fleetName: z.string().trim().min(1, "Le nom de la flotte est requis"),
  collectionPolicy: z.enum(["cash", "momo", "mix"], {
    required_error: "La politique de collecte est requise",
  }),
});

type CreateFleetFormValues = z.infer<typeof createFleetSchema>;

function metadataString(metadata: Record<string, unknown> | undefined, key: string): string {
  const value = metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

const CreateFleet = () => {
  const { user, isLoading: authLoading, refreshMemberships } = useAuth();
  const navigate = useNavigate();
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;

  const knownFullName = metadataString(metadata, "full_name");
  const knownPhone = metadataString(metadata, "phone");
  const knownCompanyName = metadataString(metadata, "company_name") || metadataString(metadata, "company");
  const knownCompanyIdentifier = metadataString(metadata, "company_identifier");
  const knownCountryCode = metadataString(metadata, "country_code").toUpperCase();

  const form = useForm<CreateFleetFormValues>({
    resolver: zodResolver(createFleetSchema),
    defaultValues: {
      fullName: knownFullName,
      phone: knownPhone,
      orgName: knownCompanyName,
      companyIdentifier: knownCompanyIdentifier,
      countryCode: knownCountryCode || "CM",
      fleetName: "Flotte principale",
      collectionPolicy: "mix",
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
        navigate("/dashboard", { replace: true });
      }
    },
  });

  const handleSubmit = async (values: CreateFleetFormValues) => {
    const canonicalMetadata = {
      ...metadata,
      full_name: values.fullName.trim(),
      phone: values.phone.trim(),
      company_name: values.orgName.trim(),
      company_identifier: values.companyIdentifier.trim(),
      country_code: values.countryCode.trim().toUpperCase(),
    };

    const { error: metadataError } = await supabase.auth.updateUser({ data: canonicalMetadata });
    if (metadataError) {
      form.setError("root", { message: metadataError.message });
      return;
    }

    createFleetMutation.mutate({
      orgName: values.orgName.trim(),
      fleetName: values.fleetName.trim(),
      collectionPolicy: values.collectionPolicy,
      countryCode: values.countryCode.trim().toUpperCase(),
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  if (authLoading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-surface-overlay flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto">
            <Truck className="w-8 h-8 text-brand" />
          </div>
          <h1 className="text-2xl font-heading font-semibold">Finalisez votre espace</h1>
          <p className="text-sm text-muted-foreground">
            Nous vous demandons uniquement les informations qui ne sont pas déjà connues.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {!knownFullName ? (
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="flex items-center gap-2"><User className="w-4 h-4" />Nom complet</FormLabel>
                  <FormControl><Input {...field} disabled={createFleetMutation.isPending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ) : null}

            {!knownPhone ? (
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="flex items-center gap-2"><Phone className="w-4 h-4" />Téléphone</FormLabel>
                  <FormControl><Input type="tel" {...field} disabled={createFleetMutation.isPending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ) : null}

            {!knownCompanyName ? (
              <FormField control={form.control} name="orgName" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="flex items-center gap-2"><Building2 className="w-4 h-4" />Entreprise</FormLabel>
                  <FormControl><Input placeholder="Transport Douala Express" {...field} disabled={createFleetMutation.isPending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ) : null}

            {!knownCompanyIdentifier ? (
              <FormField control={form.control} name="companyIdentifier" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="flex items-center gap-2"><BadgeCheck className="w-4 h-4" />Identifiant entreprise</FormLabel>
                  <FormControl><Input placeholder="RCCM, NIU, NIF..." {...field} disabled={createFleetMutation.isPending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ) : null}

            {!knownCountryCode ? (
              <FormField control={form.control} name="countryCode" render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="flex items-center gap-2"><Globe className="w-4 h-4" />Code pays</FormLabel>
                  <FormControl>
                    <Input maxLength={2} className="uppercase" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} disabled={createFleetMutation.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ) : null}

            <FormField control={form.control} name="fleetName" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="flex items-center gap-2"><Truck className="w-4 h-4" />Nom de la flotte</FormLabel>
                <FormControl><Input {...field} disabled={createFleetMutation.isPending} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="collectionPolicy" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="flex items-center gap-2"><Wallet className="w-4 h-4" />Politique de collecte</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={createFleetMutation.isPending}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="cash">Espèces uniquement</SelectItem>
                    <SelectItem value="momo">Mobile Money uniquement</SelectItem>
                    <SelectItem value="mix">Mixte (espèces + Mobile Money)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {form.formState.errors.root?.message ? (
              <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            ) : null}

            <Button type="submit" disabled={createFleetMutation.isPending} className="w-full bg-brand hover:bg-brand-dark text-white gap-2">
              {createFleetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {createFleetMutation.isPending ? "Création en cours…" : "Créer et accéder au dashboard"}
            </Button>
          </form>
        </Form>

        <button type="button" onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mx-auto transition-colors">
          <LogOut className="w-3.5 h-3.5" />Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default CreateFleet;
