import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveFleetContext } from "@/lib/dashboard/session";
import { AuthShell } from "@/components/auth/auth-shell";
import { InscriptionForm } from "./inscription-form";

export default async function InscriptionPage() {
  const supabase = await createClient();
  const context = await resolveFleetContext(supabase);

  if (context) redirect("/dashboard");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/onboarding");

  return (
    <AuthShell
      title="Créez votre compte"
      description="Choix d'offre - Paiement Mobile Money"
    >
      <InscriptionForm />
    </AuthShell>
  );
}
