import { canManageBilling } from "@/lib/dashboard/roles";
import { requireFleetContext } from "@/lib/api/require-fleet-context";

/** Session + flotte active + rôle autorisé à gérer la facturation. */
export async function requireBillingAccess() {
  const auth = await requireFleetContext();
  if ("error" in auth) {
    return auth;
  }

  if (!canManageBilling(auth.context.role)) {
    return { error: "Permission insuffisante", status: 403 as const };
  }

  return auth;
}
