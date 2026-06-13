import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveFleetContext } from "@/lib/dashboard/session";
import {
  computeDocumentsStats,
  fetchDocumentsPageData,
} from "@/lib/dashboard/fetch-documents";
import { DocumentsManager } from "@/components/dashboard/documents-manager";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const context = await resolveFleetContext(supabase);

  if (!context) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    redirect(user ? "/onboarding" : "/connexion");
  }

  const documents = await fetchDocumentsPageData(supabase, context);
  const stats = computeDocumentsStats(documents);

  return (
    <DocumentsManager
      documents={documents}
      stats={stats}
      userRole={context.role}
      fleetId={context.fleetId}
    />
  );
}
