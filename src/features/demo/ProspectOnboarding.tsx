/**
 * ProspectOnboarding — onboarding simplifié post-magic-link pour les prospects démo.
 *
 * Route : /demo/onboarding
 * Déclenché après l'authentification Supabase via magic link.
 *
 * Étapes :
 *   1. Bienvenue + profil de démo (rôle détecté automatiquement)
 *   2. Présentation de la flotte démo assignée
 *   3. Accès au dashboard
 *
 * Log chaque étape dans demo_onboarding_logs via Supabase RPC.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import {
  CheckCircle2,
  ChevronRight,
  Truck,
  Users,
  BarChart3,
  Wrench,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DemoProfileInfo {
  user_id:      string;
  email:        string;
  demo_role:    string | null;
  fleet_id:     string | null;
  fleet_name:   string | null;
  account_type: string;
  expires_at:   string | null;
}

type OnboardingStep = 1 | 2 | 3;

// ─── Fonctionnalités mises en avant par rôle ──────────────────────────────────

const ROLE_FEATURES: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; desc: string }[]> = {
  manager: [
    { icon: BarChart3, label: "Tableau de bord",    desc: "Vue synthétique de ta flotte en temps réel" },
    { icon: Truck,     label: "Gestion véhicules",  desc: "Suivi des statuts, immatriculations, affectations" },
    { icon: Wrench,    label: "Maintenance",         desc: "Planification et historique des interventions" },
    { icon: Users,     label: "Équipe",              desc: "Conducteurs, mécaniciens, rôles et permissions" },
  ],
  driver: [
    { icon: Truck,       label: "Mon véhicule",       desc: "Accès à ton véhicule affecté" },
    { icon: ShieldCheck, label: "Contrôles DVIR",     desc: "Inspections pré/post-trip simplifiées" },
    { icon: BarChart3,   label: "Missions",            desc: "Suivi des trajets et rapports de déplacement" },
  ],
  mechanic: [
    { icon: Wrench,    label: "Interventions",       desc: "Gestion des travaux et bons de réparation" },
    { icon: Truck,     label: "Parc véhicules",      desc: "État et historique de tous les véhicules" },
    { icon: BarChart3, label: "Maintenance prédic.", desc: "Alertes IA avant panne" },
  ],
  organizer: [
    { icon: BarChart3,   label: "Analytiques",        desc: "Rapports de performance flotte & conducteurs" },
    { icon: Truck,       label: "Flotte complète",    desc: "Tous les véhicules et affectations" },
    { icon: Users,       label: "Équipes",             desc: "Administration complète des membres" },
    { icon: ShieldCheck, label: "Compliance CEMAC",   desc: "Suivi transit et documents douaniers" },
  ],
};

const DEFAULT_FEATURES = ROLE_FEATURES.manager;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "accès illimité";
  const d = new Date(expiresAt);
  const diffH = (d.getTime() - Date.now()) / 3_600_000;
  if (diffH < 24) return `${Math.ceil(diffH)}h d'accès restantes`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} jour${diffD > 1 ? "s" : ""} d'accès`;
}

const ROLE_LABEL: Record<string, string> = {
  manager:   "Manager",
  driver:    "Conducteur",
  mechanic:  "Mécanicien",
  organizer: "Organisateur",
};

// ─── Hook : profil démo courant ───────────────────────────────────────────────

function useDemoProfile() {
  const [profile,   setProfile]   = useState<DemoProfileInfo | null>(null);
  const [isLoading, setLoading]   = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("demo_profiles")
        .select(`
          user_id, email, demo_role, fleet_id, account_type, expires_at,
          flottes:fleet_id ( name )
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setProfile({
          user_id:      data.user_id as string,
          email:        (data.email ?? user.email ?? "") as string,
          demo_role:    data.demo_role as string | null,
          fleet_id:     data.fleet_id as string | null,
          fleet_name:   (data.flottes as { name: string } | null)?.name ?? null,
          account_type: data.account_type as string,
          expires_at:   data.expires_at as string | null,
        });
      }

      setLoading(false);
    }
    void fetch();
  }, []);

  return { profile, isLoading };
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ProspectOnboarding() {
  const navigate = useNavigate();
  const { profile, isLoading } = useDemoProfile();
  const [step, setStep] = useState<OnboardingStep>(1);
  const logged = useRef<Set<number>>(new Set());

  // Log chaque étape dans demo_onboarding_logs
  const logStep = useCallback(async (stepNum: number) => {
    if (logged.current.has(stepNum) || !profile) return;
    logged.current.add(stepNum);

    await supabase.from("demo_onboarding_logs").insert({
      user_id:       profile.user_id,
      magic_link_id: null,
      step:          stepNum,
      metadata:      { role: profile.demo_role, fleet_id: profile.fleet_id },
    });
  }, [profile]);

  useEffect(() => {
    void logStep(step);
  }, [step, logStep]);

  function goNext() {
    if (step < 3) setStep((s) => (s + 1) as OnboardingStep);
    else          void navigate("/dashboard");
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const features = ROLE_FEATURES[profile?.demo_role ?? ""] ?? DEFAULT_FEATURES;

  // ── Layout commun ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Barre de progression */}
      <div className="w-full h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-8">

          {/* Logo */}
          <div className="flex justify-center">
            <img
              src="/logo.svg"
              alt="E-Samba"
              className="h-8 w-auto"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>

          {/* ── Étape 1 : Bienvenue ── */}
          {step === 1 && (
            <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Étape 1 sur 3</p>
                <h1 className="text-2xl font-bold">Bienvenue sur E-Samba 👋</h1>
                <p className="text-muted-foreground text-sm">
                  Ton accès démo est prêt. Explore la plateforme sans limites.
                </p>
              </div>

              {/* Infos du compte */}
              <div className="rounded-lg border bg-card p-4 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-mono">{profile?.email ?? "—"}</span>
                </div>
                {profile?.demo_role && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Rôle démo</span>
                    <Badge variant="secondary">
                      {ROLE_LABEL[profile.demo_role] ?? profile.demo_role}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Durée</span>
                  <span className="text-sm font-medium text-emerald-600">
                    {formatExpiry(profile?.expires_at ?? null)}
                  </span>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={goNext}>
                Découvrir E-Samba
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* ── Étape 2 : Fonctionnalités ── */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">Étape 2 sur 3</p>
                <h2 className="text-xl font-bold">Ce que tu peux faire</h2>
                {profile?.fleet_name && (
                  <p className="text-sm text-muted-foreground">
                    Flotte démo : <span className="font-medium text-foreground">{profile.fleet_name}</span>
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {features.map(({ icon: Icon, label, desc }) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className="rounded-md bg-primary/10 p-2 shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 ml-auto mt-0.5" />
                  </div>
                ))}
              </div>

              <Button className="w-full" size="lg" onClick={goNext}>
                Continuer
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* ── Étape 3 : Prêt ── */}
          {step === 3 && (
            <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Étape 3 sur 3</p>
                <h2 className="text-2xl font-bold">Tu es prêt 🚀</h2>
                <p className="text-muted-foreground text-sm">
                  Le dashboard est pré-rempli avec des données réalistes.
                  Navigue librement et explore toutes les fonctionnalités.
                </p>
              </div>

              {/* Conseils rapides */}
              <div className="rounded-lg border bg-muted/40 p-4 text-left text-sm space-y-2">
                {[
                  "Commence par le tableau de bord principal",
                  "Explore un véhicule pour voir l'historique de maintenance",
                  "Teste la création d'un rapport d'inspection",
                ].map((tip, i) => (
                  <div key={i} className={cn("flex items-start gap-2", i > 0 && "pt-2 border-t border-border")}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{tip}</span>
                  </div>
                ))}
              </div>

              <Button className="w-full" size="lg" onClick={goNext}>
                Accéder au dashboard
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>

              <p className="text-xs text-muted-foreground">
                Des questions ? Contacte{" "}
                <a
                  href="mailto:contact@e-samba.com"
                  className="underline hover:text-foreground"
                >
                  contact@e-samba.com
                </a>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
