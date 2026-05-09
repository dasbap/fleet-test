import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { MockChecklist } from "@/lib/operationsMock";

interface ChecklistCardProps {
  checklist: MockChecklist;
}

export function ChecklistCard({ checklist }: ChecklistCardProps) {
  const done = checklist.items.filter((i) => i.done).length;
  const total = checklist.items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-heading text-base">{checklist.title}</CardTitle>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {done}/{total}
          </span>
        </div>
        <Progress value={pct} className="h-1.5" aria-label={`Avancement ${pct} pour cent`} />
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="space-y-2">
          {checklist.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              {item.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
