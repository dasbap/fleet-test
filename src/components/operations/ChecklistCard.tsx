import { CheckCircle2, Circle } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import type { MockChecklist } from "@/lib/operationsMock";

interface ChecklistCardProps {
  checklist: MockChecklist;
  onToggleItem?: (itemId: string) => void;
  readOnly?: boolean;
  showTitle?: boolean;
  /** Lien optionnel vers le DVIR détaillé (pré/post trajet). */
  dvirLinkLabel?: string;
}

export function ChecklistCard({
  checklist,
  onToggleItem,
  readOnly = false,
  showTitle = true,
  dvirLinkLabel,
}: ChecklistCardProps) {
  const done = checklist.items.filter((i) => i.done).length;
  const total = checklist.items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const interactive = !readOnly && Boolean(onToggleItem);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          {showTitle ? (
            <CardTitle className="font-heading text-base">{checklist.title}</CardTitle>
          ) : (
            <span className="sr-only">{checklist.title}</span>
          )}
          <span className="ml-auto text-xs font-medium tabular-nums text-muted-foreground">
            {done}/{total}
          </span>
        </div>
        <Progress value={pct} className="h-1.5" aria-label={`Avancement ${pct} pour cent`} />
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="space-y-2">
          {checklist.items.map((item) => {
            const content = (
              <>
                {item.done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
              </>
            );

            if (interactive) {
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onToggleItem?.(item.id)}
                    aria-pressed={item.done}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md px-1 py-1 text-left text-sm transition-colors",
                      "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    {content}
                  </button>
                </li>
              );
            }

            return (
              <li key={item.id} className="flex items-start gap-2 px-1 py-1 text-sm">
                {content}
              </li>
            );
          })}
        </ul>
        {dvirLinkLabel ? (
          <p className="pt-1">
            <Link
              to={ROUTE_PATHS.inspectionsNew}
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              {dvirLinkLabel}
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
