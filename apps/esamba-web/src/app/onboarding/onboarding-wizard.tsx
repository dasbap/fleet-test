"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogOut,
  Ticket,
  Truck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  acceptInvitationCode,
  createFirstVehicle,
  createFleetInvitationCode,
  createFleetOnboarding,
  isCemacCountryCode,
} from "@/lib/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const step1Schema = z.object({
  org_name: z.string().min(2, "Nom requis (min 2 caractères)"),
  org_phone: z.string().min(8, "Téléphone requis"),
  org_city: z.string().min(2, "Ville requise"),
  org_country: z.enum(["CM", "SN", "CI", "GA", "BF", "CD", "TG", "BJ"]),
  sector: z.string().min(1, "Secteur requis"),
});

const step2Schema = z.object({
  plate_number: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.string().optional(),
  fuel_type: z.string().optional(),
});

const step3Schema = z.object({
  invite_emails: z.string().optional(),
});

type Step1Form = z.infer<typeof step1Schema>;
type Step2Form = z.infer<typeof step2Schema>;
type Step3Form = z.infer<typeof step3Schema>;

const COUNTRIES = [
  { code: "CM", name: "🇨🇲 Cameroun" },
  { code: "SN", name: "🇸🇳 Sénégal" },
  { code: "CI", name: "🇨🇮 Côte d'Ivoire" },
  { code: "GA", name: "🇬🇦 Gabon" },
  { code: "BF", name: "🇧🇫 Burkina Faso" },
  { code: "CD", name: "🇨🇩 Congo RDC" },
  { code: "TG", name: "🇹🇬 Togo" },
  { code: "BJ", name: "🇧🇯 Bénin" },
] as const;

const SECTORS = [
  "Transport de marchandises",
  "Transport de voyageurs",
  "BTP / Construction",
  "Logistique",
  "Administration publique",
  "Agriculture",
  "Mining / Extraction",
  "Santé",
  "Distribution / Commerce",
  "Autre",
];

const STEPS = [
  { id: 1, label: "Votre entreprise", icon: Building2 },
  { id: 2, label: "Premier véhicule", icon: Truck },
  { id: 3, label: "Inviter l'équipe", icon: UserPlus },
] as const;

const INVITATION_ERRORS: Record<string, string> = {
  not_found: "Code d'invitation introuvable.",
  expired: "Cette invitation a expiré.",
  max_uses: "Cette invitation a atteint sa limite d'utilisation.",
  invalid_response: "Réponse serveur invalide.",
  unexpected_error: "Erreur inattendue. Réessayez.",
};

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all",
              current === step.id
                ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                : current > step.id
                  ? "bg-green-600 text-white"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {current > step.id ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              step.id
            )}
          </div>
          <span
            className={cn(
              "hidden text-xs sm:block",
              current === step.id
                ? "font-semibold text-foreground"
                : "text-muted-foreground",
            )}
          >
            {step.label}
          </span>
          {index < STEPS.length - 1 ? (
            <div
              className={cn(
                "mx-1 h-0.5 w-8",
                current > step.id ? "bg-green-600" : "bg-border",
              )}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [fleetId, setFleetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [invitationCode, setInvitationCode] = useState("");
  const [invitationCodeToShare, setInvitationCodeToShare] = useState<
    string | null
  >(null);

  const form1 = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: { org_country: "CM" },
  });

  const form2 = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    defaultValues: { fuel_type: "diesel" },
  });

  const form3 = useForm<Step3Form>({
    resolver: zodResolver(step3Schema),
  });

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/connexion");
    router.refresh();
  }

  async function submitStep1(data: Step1Form) {
    setLoading(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/connexion");
        return;
      }

      if (!isCemacCountryCode(data.org_country)) {
        throw new Error("Pays non pris en charge.");
      }

      const result = await createFleetOnboarding(supabase, {
        orgName: data.org_name,
        fleetName: "Flotte principale",
        collectionPolicy: "mix",
        countryCode: data.org_country,
        orgPhone: data.org_phone,
        orgCity: data.org_city,
        sector: data.sector,
      });

      setFleetId(result.fleetId);
      setStep(2);
      toast.success("Organisation créée !");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Problème inattendu.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitStep2(data: Step2Form) {
    if (!data.plate_number?.trim()) {
      setStep(3);
      return;
    }

    if (!fleetId) {
      toast.error("Flotte introuvable. Recommencez l'étape 1.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      await createFirstVehicle(supabase, {
        fleetId,
        registration: data.plate_number,
        brand: data.brand,
        model: data.model,
        year: data.year ? Number.parseInt(data.year, 10) : undefined,
      });
      toast.success("Véhicule ajouté !");
      setStep(3);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de l'ajout.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitStep3(data: Step3Form) {
    if (!fleetId) {
      router.push("/dashboard");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const emails = (data.invite_emails ?? "")
        .split(/[,;\n]/)
        .map((e) => e.trim())
        .filter((e) => e && /\S+@\S+\.\S+/.test(e));

      if (emails.length > 0) {
        const code = await createFleetInvitationCode(supabase, fleetId);
        setInvitationCodeToShare(code);
        toast.success(
          `Code d'invitation créé : ${code}. Partagez-le avec votre équipe (${emails.length} email(s) saisi(s)). L'envoi automatique par email arrive bientôt.`,
          { duration: 8000 },
        );
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la finalisation.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinFleet(event: React.FormEvent) {
    event.preventDefault();
    if (!invitationCode.trim()) {
      toast.error("Saisissez un code d'invitation.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const result = await acceptInvitationCode(supabase, invitationCode);
      if (!result.ok) {
        const key = result.error ?? "unexpected_error";
        toast.error(INVITATION_ERRORS[key] ?? key);
        return;
      }

      toast.success("Vous avez rejoint la flotte.");
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (showJoin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Rejoindre une flotte
          </CardTitle>
          <CardDescription>
            Saisissez le code d&apos;invitation reçu de votre responsable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={(e) => void handleJoinFleet(e)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invitationCode">Code d&apos;invitation</Label>
              <Input
                id="invitationCode"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
                placeholder="ESAMBA-XXXX"
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Rejoindre la flotte
            </Button>
          </form>
          <Button
            type="button"
            variant="ghost"
            className="w-full gap-2"
            onClick={() => setShowJoin(false)}
          >
            <ChevronLeft className="h-4 w-4" />
            Retour à la configuration
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-lg space-y-4">
      <div className="text-center">
        <h1 className="text-lg font-semibold">Configurons votre espace</h1>
        <p className="text-sm text-muted-foreground">3 étapes · 2 minutes</p>
      </div>

      <StepIndicator current={step} />

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Votre entreprise</CardTitle>
            <CardDescription>
              Ces informations apparaîtront sur vos factures.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form1.handleSubmit(submitStep1)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label>Nom de l&apos;entreprise *</Label>
                <Input
                  placeholder="Transport Express Douala"
                  disabled={loading}
                  {...form1.register("org_name")}
                />
                {form1.formState.errors.org_name ? (
                  <p className="text-xs text-destructive">
                    {form1.formState.errors.org_name.message}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Pays *</Label>
                  <Select
                    defaultValue="CM"
                    onValueChange={(value) =>
                      form1.setValue(
                        "org_country",
                        value as Step1Form["org_country"],
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Ville *</Label>
                  <Input
                    placeholder="Douala"
                    disabled={loading}
                    {...form1.register("org_city")}
                  />
                  {form1.formState.errors.org_city ? (
                    <p className="text-xs text-destructive">
                      {form1.formState.errors.org_city.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Téléphone *</Label>
                <Input
                  placeholder="+237 6XX XXX XXX"
                  disabled={loading}
                  {...form1.register("org_phone")}
                />
                {form1.formState.errors.org_phone ? (
                  <p className="text-xs text-destructive">
                    {form1.formState.errors.org_phone.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label>Secteur d&apos;activité *</Label>
                <Select
                  onValueChange={(value) =>
                    form1.setValue("sector", value as string)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un secteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form1.formState.errors.sector ? (
                  <p className="text-xs text-destructive">
                    {form1.formState.errors.sector.message}
                  </p>
                ) : null}
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continuer
                <ChevronRight className="h-4 w-4" />
              </Button>
            </form>

            <button
              type="button"
              className="mt-4 w-full text-center text-sm text-primary hover:underline"
              onClick={() => setShowJoin(true)}
            >
              J&apos;ai déjà un code d&apos;invitation
            </button>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Premier véhicule</CardTitle>
            <CardDescription>
              Optionnel — vous pouvez ajouter des véhicules plus tard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form2.handleSubmit(submitStep2)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label>Numéro de plaque</Label>
                <Input
                  placeholder="LT-1234-A"
                  className="uppercase"
                  disabled={loading}
                  {...form2.register("plate_number")}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Marque</Label>
                  <Input
                    placeholder="Toyota"
                    disabled={loading}
                    {...form2.register("brand")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Modèle</Label>
                  <Input
                    placeholder="Hilux"
                    disabled={loading}
                    {...form2.register("model")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Année</Label>
                  <Input
                    type="number"
                    placeholder="2022"
                    min={1990}
                    max={new Date().getFullYear() + 1}
                    disabled={loading}
                    {...form2.register("year")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Carburant</Label>
                  <Select
                    defaultValue="diesel"
                    onValueChange={(value) =>
                      form2.setValue("fuel_type", value as string)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="gasoline">Essence</SelectItem>
                      <SelectItem value="lpg">GPL</SelectItem>
                      <SelectItem value="electric">Électrique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                  onClick={() => setStep(3)}
                >
                  Passer cette étape
                </Button>
                <Button
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Continuer
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Inviter votre équipe</CardTitle>
            <CardDescription>
              Optionnel — un code d&apos;invitation sera généré à partager.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitationCodeToShare ? (
              <p className="mb-4 rounded-lg border bg-muted/50 p-3 text-sm">
                Code à partager :{" "}
                <strong className="font-mono">{invitationCodeToShare}</strong>
              </p>
            ) : null}

            <form
              onSubmit={form3.handleSubmit(submitStep3)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label>Emails des membres à inviter</Label>
                <textarea
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[100px] w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={
                    "manager@entreprise.com\nconducteur1@gmail.com"
                  }
                  disabled={loading}
                  {...form3.register("invite_emails")}
                />
                <p className="text-xs text-muted-foreground">
                  Séparez les emails par une virgule, un point-virgule ou un
                  retour à la ligne. L&apos;envoi automatique par email arrive
                  bientôt.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                  onClick={() => {
                    router.push("/dashboard");
                    router.refresh();
                  }}
                >
                  Passer — tableau de bord
                </Button>
                <Button type="submit" className="flex-1 gap-2" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <CheckCircle className="h-4 w-4" />
                  Terminer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-center gap-4 text-sm">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => void handleSignOut()}
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </Button>
        <Link href="/connexion" className="text-muted-foreground hover:underline">
          Retour connexion
        </Link>
      </div>
    </div>
  );
}
