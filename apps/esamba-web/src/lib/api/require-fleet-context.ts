import { createClient } from "@/lib/supabase/server";
import { resolveFleetContext } from "@/lib/dashboard/session";

export async function requireFleetContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié", status: 401 as const };
  }

  const context = await resolveFleetContext(supabase);
  if (!context) {
    return { error: "Aucune flotte active", status: 403 as const };
  }

  return { supabase, user, context };
}
