import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { OperationStatusBadge } from "./OperationStatusBadge";
import type { MockTaskItem } from "@/lib/operationsMock";

interface TaskRowCardProps {
  task: MockTaskItem;
}

export function TaskRowCard({ task }: TaskRowCardProps) {
  return (
    <Link
      to={task.href}
      className="block rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="transition-colors hover:bg-muted/30">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-snug">{task.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {task.assignee} · {task.dueLabel}
            </p>
          </div>
          <OperationStatusBadge status={task.status} />
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        </CardContent>
      </Card>
    </Link>
  );
}
