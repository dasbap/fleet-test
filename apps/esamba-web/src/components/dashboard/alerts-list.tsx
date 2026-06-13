import { differenceInCalendarDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ExpiringDoc {
  id: string;
  vehicle_id: string;
  doc_type: string;
  expires_at: string;
  days_remaining: number;
  registration?: string | null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  insurance: "Assurance",
  registration: "Carte grise",
  technical_inspection: "Contrôle technique",
  transport_title: "Titre de transport",
  driver_license: "Permis de conduire",
};

function docLabel(docType: string) {
  return DOC_TYPE_LABELS[docType] ?? docType;
}

function severityVariant(daysRemaining: number) {
  if (daysRemaining < 0) return "destructive" as const;
  if (daysRemaining <= 7) return "default" as const;
  if (daysRemaining <= 30) return "secondary" as const;
  return "outline" as const;
}

function severityLabel(daysRemaining: number) {
  if (daysRemaining < 0) return "Expiré";
  if (daysRemaining === 0) return "Aujourd'hui";
  return `J-${daysRemaining}`;
}

interface AlertsListProps {
  docs?: ExpiringDoc[];
}

export function AlertsList({ docs = [] }: AlertsListProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Documents à surveiller</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun document expirant dans les 30 prochains jours.
          </p>
        ) : (
          docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {docLabel(doc.doc_type)}
                  {doc.registration ? ` · ${doc.registration}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Expire le{" "}
                  {format(new Date(doc.expires_at), "d MMM yyyy", { locale: fr })}
                </p>
              </div>
              <Badge variant={severityVariant(doc.days_remaining)}>
                {severityLabel(doc.days_remaining)}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/** Calcule les jours restants pour l'affichage. */
export function toExpiringDoc(
  row: {
    id: string;
    vehicle_id: string;
    doc_type: string;
    expires_at: string;
    vehicules?: { registration: string } | { registration: string }[] | null;
  },
): ExpiringDoc {
  const vehicle = Array.isArray(row.vehicules)
    ? row.vehicules[0]
    : row.vehicules;

  return {
    id: row.id,
    vehicle_id: row.vehicle_id,
    doc_type: row.doc_type,
    expires_at: row.expires_at,
    days_remaining: differenceInCalendarDays(
      new Date(row.expires_at),
      new Date(),
    ),
    registration: vehicle?.registration ?? null,
  };
}
