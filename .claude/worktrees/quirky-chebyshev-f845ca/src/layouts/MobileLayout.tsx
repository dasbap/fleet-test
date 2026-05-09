import type { AppRole } from "@/hooks/useAuth";
import { MobileAppShell } from "@/layouts/MobileAppShell";

interface MobileLayoutProps {
  userRole: AppRole | null;
}

/**
 * Coque mobile Flotte E-Samba : contenu scrollable + barre d’onglets inférieure (safe area iOS / Android).
 * Montée uniquement sous Capacitor (voir DashboardLayout) : sur navigateur web, le dashboard conserve la sidebar.
 */
export default function MobileLayout({ userRole }: MobileLayoutProps) {
  return <MobileAppShell userRole={userRole} />;
}
