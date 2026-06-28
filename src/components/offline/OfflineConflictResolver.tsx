import { useCallback } from "react";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { OfflineQueueService } from "@/services/offlineQueue.service";
import { getActionJournal, updateActionJournalStatus } from "@/lib/offline/action-journal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const queueService = new OfflineQueueService();

interface OfflineConflictResolverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Résolution minimale des conflits offline (phase 3).
 */
export function OfflineConflictResolver({ open, onOpenChange }: OfflineConflictResolverProps) {
  const { flush } = useOfflineQueue();
  const conflicts = getActionJournal().filter((entry) => entry.status === "conflict");

  const handleKeepLocal = useCallback(async () => {
    for (const entry of conflicts) {
      updateActionJournalStatus(entry.jobId, "local");
    }
    await flush();
    onOpenChange(false);
  }, [conflicts, flush, onOpenChange]);

  const handleAcceptServer = useCallback(async () => {
    for (const entry of conflicts) {
      await queueService.markSucceeded(entry.jobId);
      updateActionJournalStatus(entry.jobId, "synced");
    }
    onOpenChange(false);
  }, [conflicts, onOpenChange]);

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conflit de synchronisation</DialogTitle>
          <DialogDescription>
            {conflicts.length} action(s) terrain sont en conflit avec le serveur.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {conflicts.map((entry) => (
            <li key={entry.id}>
              {entry.summary}
              {entry.errorMessage ? ` — ${entry.errorMessage}` : ""}
            </li>
          ))}
        </ul>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => void handleAcceptServer()}>
            Accepter serveur
          </Button>
          <Button onClick={() => void handleKeepLocal()}>Conserver local</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
