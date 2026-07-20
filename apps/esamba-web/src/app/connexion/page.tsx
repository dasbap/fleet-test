import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveFleetContext } from "@/lib/dashboard/session";
import { AuthShell } from "@/components/auth/auth-shell";
import { ConnexionForm } from "./connexion-form";

interface ConnexionPageProps {
  searchParams: Promise<{ next?: string }>;
}

function safeNextPath(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

export default async function ConnexionPage({ searchParams }: ConnexionPageProps) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);

  const supabase = await createClient();
  const context = await resolveFleetContext(supabase);

  if (context) {
    redirect(nextPath);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/onboarding");
  }

  return (
    <AuthShell
      title="Connexion à votre espace"
      description="Gestion de flotte · Afrique francophone"
    >
      <ConnexionForm nextPath={nextPath} />
    </AuthShell>
  );
}
