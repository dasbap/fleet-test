import { Badge } from "@/components/ui/badge";
import { mockStatusLabels, type MockOpsStatus } from "@/lib/operationsMock";
import { cn } from "@/lib/utils";

const variantMap: Record<MockOpsStatus, "default" | "secondary" | "destructive" | "outline"> = {
  planned: "secondary",
  in_progress: "default",
  completed: "outline",
  blocked: "destructive",
  attention: "destructive",
};

interface OperationStatusBadgeProps {
  status: MockOpsStatus;
  className?: string;
}

export function OperationStatusBadge({ status, className }: OperationStatusBadgeProps) {
  return (
    <Badge variant={variantMap[status]} className={cn("shrink-0 font-normal", className)}>
      {mockStatusLabels[status]}
    </Badge>
  );
}
