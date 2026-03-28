/**
 * Teinte de fond du conteneur autour de `<Outlet />` (app native / coque mobile).
 * Aligné sur les onglets principaux : Accueil, Flotte, Alertes, Opérations, Compte.
 * Parc / véhicules : maintenance atelier et historique partagent la même enveloppe que la Flotte.
 */
export function getMobileOutletShellClass(pathname: string): string {
  const p = pathname.replace(/\/+$/, "") || "/";

  if (p === "/dashboard") {
    return "bg-primary/[0.04] dark:bg-primary/[0.07]";
  }

  if (
    p.startsWith("/dashboard/vehicles") ||
    p.startsWith("/dashboard/my-vehicle") ||
    p.startsWith("/dashboard/maintenance") ||
    p.startsWith("/dashboard/history")
  ) {
    return "bg-muted/40 dark:bg-muted/25";
  }

  if (p.startsWith("/dashboard/alerts")) {
    return "bg-warning/[0.06] dark:bg-warning/[0.08]";
  }

  if (p.startsWith("/dashboard/operations")) {
    return "bg-primary/[0.055] dark:bg-primary/[0.09]";
  }

  if (p.startsWith("/dashboard/profile") || p.startsWith("/dashboard/settings")) {
    return "bg-muted/35 dark:bg-muted/30";
  }

  return "bg-muted/25 dark:bg-muted/20";
}
