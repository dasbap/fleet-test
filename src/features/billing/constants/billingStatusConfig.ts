import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Zap,
} from "lucide-react";
import type { BillingStatus } from "@/types/fleet-billing";

export const STATUS_CONFIG: Record<
  BillingStatus,
  {
    label: string;
    badgeClass: string;
    icon: React.ElementType;
    alertClass?: string;
    alertTitle?: string;
    alertDesc?: string;
  }
> = {
  trial: {
    label: "Essai gratuit",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Clock,
  },
  active: {
    label: "Actif",
    badgeClass: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
  grace: {
    label: "Période de grâce",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    icon: AlertTriangle,
    alertClass: "border-amber-200 bg-amber-50 text-amber-800",
    alertTitle: "Période de grâce — accès maintenu temporairement",
    alertDesc: "Votre abonnement a expiré. Un accès minimal au terrain est conservé. Renouvelez avant la suspension automatique.",
  },
  suspended: {
    label: "Suspendu",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    icon: ShieldAlert,
    alertClass: "border-red-200 bg-red-50 text-red-800",
    alertTitle: "Flotte suspendue — accès coupé",
    alertDesc: "Vos véhicules sont inactifs et les features premium désactivées. Renouvelez votre abonnement pour les réactiver.",
  },
  enterprise: {
    label: "Entreprise",
    badgeClass: "bg-purple-100 text-purple-700 border-purple-200",
    icon: Zap,
  },
};
