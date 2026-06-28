import { useEffect, useState } from "react";
import { getActionJournal } from "@/lib/offline/action-journal";
import { OfflineConflictResolver } from "@/components/offline/OfflineConflictResolver";

/** Ouvre le dialogue de conflit dès qu'une entrée journal est en conflit. */
export function TerrainConflictBridge() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      const hasConflict = getActionJournal().some((e) => e.status === "conflict");
      if (hasConflict) setOpen(true);
    };
    check();
    const id = setInterval(check, 10_000);
    return () => clearInterval(id);
  }, []);

  return <OfflineConflictResolver open={open} onOpenChange={setOpen} />;
}
