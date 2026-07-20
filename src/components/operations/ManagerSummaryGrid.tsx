import { Card, CardContent } from "@/components/ui/card";

interface Stat {
  label: string;
  value: string;
  hint?: string;
}

interface ManagerSummaryGridProps {
  stats: Stat[];
}

export function ManagerSummaryGrid({ stats }: ManagerSummaryGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-1 font-heading text-3xl font-bold tabular-nums">{s.value}</p>
            {s.hint ? <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
