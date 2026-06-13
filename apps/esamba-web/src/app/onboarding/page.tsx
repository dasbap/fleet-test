import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveFleetContext } from "@/lib/dashboard/session";
import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const context = await resolveFleetContext(supabase);
  if (context) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      title="E-Samba"
      description="Configurons votre espace de gestion de flotte."
    >
      <OnboardingWizard />
    </AuthShell>
  );
}
