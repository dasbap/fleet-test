import type { MockChecklist, MockChecklistItem } from "@/features/operations/mocks/operationsMock";

export interface DriverChecklistsPair {
  departureChecklist: MockChecklist;
  arrivalChecklist: MockChecklist;
}

/** Contexte serveur pour enrichir la progression des checklists ops conducteur. */
export interface ChecklistServerContext {
  hasPreTripDvirToday?: boolean;
  hasPostTripDvirToday?: boolean;
  hasClosureWithKm?: boolean;
}

export interface LocalChecklistState {
  departure: Record<string, boolean>;
  arrival: Record<string, boolean>;
}

const ARRIVAL_VISUAL_ITEM_IDS = new Set(["a1", "a2"]);
const ARRIVAL_KM_ITEM_ID = "a3";

function mapChecklistItems(
  items: MockChecklistItem[],
  resolveDone: (item: MockChecklistItem) => boolean,
): MockChecklistItem[] {
  return items.map((item) => ({
    ...item,
    done: resolveDone(item),
  }));
}

/** Applique la progression issue du serveur (DVIR, clôture). */
export function mergeServerChecklistProgress(
  checklists: DriverChecklistsPair,
  ctx: ChecklistServerContext,
): DriverChecklistsPair {
  const { hasPreTripDvirToday, hasPostTripDvirToday, hasClosureWithKm } = ctx;

  return {
    departureChecklist: {
      ...checklists.departureChecklist,
      items: mapChecklistItems(checklists.departureChecklist.items, (item) =>
        hasPreTripDvirToday ? true : item.done,
      ),
    },
    arrivalChecklist: {
      ...checklists.arrivalChecklist,
      items: mapChecklistItems(checklists.arrivalChecklist.items, (item) => {
        if (hasClosureWithKm && item.id === ARRIVAL_KM_ITEM_ID) return true;
        if (hasPostTripDvirToday && ARRIVAL_VISUAL_ITEM_IDS.has(item.id)) return true;
        return item.done;
      }),
    },
  };
}

/** Fusionne overrides locaux : done = serveurDone OR localDone. */
export function applyLocalChecklistOverrides(
  checklists: DriverChecklistsPair,
  local: LocalChecklistState,
): DriverChecklistsPair {
  return {
    departureChecklist: {
      ...checklists.departureChecklist,
      items: mapChecklistItems(
        checklists.departureChecklist.items,
        (item) => item.done || local.departure[item.id] === true,
      ),
    },
    arrivalChecklist: {
      ...checklists.arrivalChecklist,
      items: mapChecklistItems(
        checklists.arrivalChecklist.items,
        (item) => item.done || local.arrival[item.id] === true,
      ),
    },
  };
}

export function toggleLocalItem(
  local: Record<string, boolean>,
  itemId: string,
): Record<string, boolean> {
  return { ...local, [itemId]: !local[itemId] };
}

export function buildChecklistStorageKey(userId: string, shiftId: string | null | undefined): string {
  return `esamba:ops-checklist:${userId}:${shiftId ?? "sans-creneau"}`;
}
