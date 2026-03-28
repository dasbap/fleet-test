import type {
  CachedRecentMission,
  CachedRecentVehicle,
  IncidentDeclarationDraft,
  LocalSessionSnapshot,
  LocalSyncState,
} from "@/types/local-cache";
import type { AccountSyncDisplayStatus } from "@/types/account-preferences";
import type { Mission } from "@/types/mission";
import { storageGet, storageRemove, storageSet } from "@/lib/storage/localStorageService";
import { storageKeys } from "@/lib/storage/storageKeys";

const MAX_RECENT_MISSIONS = 25;
const MAX_RECENT_VEHICLES = 15;

const defaultSyncState = (): LocalSyncState => ({
  lastSuccessfulSyncAt: null,
  displayStatus: "synced",
  lastSyncError: null,
});

/* --- Abonnements légers (même onglet) pour useSyncExternalStore --- */

const listeners = new Set<() => void>();

export function subscribeLocalCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyLocalCache(): void {
  listeners.forEach((fn) => fn());
}

/* --- Session --- */

export function getLocalSessionSnapshot(): LocalSessionSnapshot | null {
  return storageGet<LocalSessionSnapshot>(storageKeys.session);
}

export function setLocalSessionSnapshot(snapshot: LocalSessionSnapshot): void {
  storageSet(storageKeys.session, snapshot);
  notifyLocalCache();
}

export function clearLocalSessionSnapshot(): void {
  storageRemove(storageKeys.session);
  notifyLocalCache();
}

/* --- Missions récentes --- */

function readMissions(): CachedRecentMission[] {
  return storageGet<CachedRecentMission[]>(storageKeys.recentMissions) ?? [];
}

export function getRecentMissions(): CachedRecentMission[] {
  return readMissions();
}

/** Enregistre ou met à jour une mission en tête de liste (dédoublonnage par id). */
export function pushRecentMission(mission: Mission): void {
  const row: CachedRecentMission = {
    id: mission.id,
    fleetId: mission.fleetId,
    title: mission.title,
    reference: mission.reference,
    status: mission.status,
    cachedAt: new Date().toISOString(),
  };
  const list = readMissions().filter((m) => m.id !== mission.id);
  list.unshift(row);
  storageSet(storageKeys.recentMissions, list.slice(0, MAX_RECENT_MISSIONS));
  notifyLocalCache();
}

/* --- Véhicules récemment consultés --- */

function readVehicles(): CachedRecentVehicle[] {
  return storageGet<CachedRecentVehicle[]>(storageKeys.recentVehicles) ?? [];
}

export function getRecentVehicles(): CachedRecentVehicle[] {
  return readVehicles();
}

export function recordRecentVehicleView(entry: Omit<CachedRecentVehicle, "viewedAt">): void {
  const viewedAt = new Date().toISOString();
  const list = readVehicles().filter((v) => v.vehicleId !== entry.vehicleId);
  list.unshift({ ...entry, viewedAt });
  storageSet(storageKeys.recentVehicles, list.slice(0, MAX_RECENT_VEHICLES));
  notifyLocalCache();
}

/* --- Brouillons incidents --- */

function readDrafts(): IncidentDeclarationDraft[] {
  return storageGet<IncidentDeclarationDraft[]>(storageKeys.incidentDrafts) ?? [];
}

export function getIncidentDrafts(): IncidentDeclarationDraft[] {
  return readDrafts();
}

export function countPendingIncidentDrafts(): number {
  return readDrafts().filter((d) => d.status === "pending" || d.status === "failed").length;
}

export function saveIncidentDeclarationDraft(
  draft: Omit<IncidentDeclarationDraft, "id" | "createdAt" | "status" | "lastError"> & {
    id?: string;
  },
): IncidentDeclarationDraft {
  const id = draft.id ?? crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const full: IncidentDeclarationDraft = {
    ...draft,
    id,
    createdAt,
    status: "pending",
  };
  const list = readDrafts();
  list.unshift(full);
  storageSet(storageKeys.incidentDrafts, list);
  patchLocalSyncState({
    displayStatus: "pending",
    lastSyncError: null,
  });
  notifyLocalCache();
  return full;
}

export function updateIncidentDraft(
  id: string,
  patch: Partial<Pick<IncidentDeclarationDraft, "status" | "lastError">>,
): void {
  const list = readDrafts().map((d) => (d.id === id ? { ...d, ...patch } : d));
  storageSet(storageKeys.incidentDrafts, list);
  notifyLocalCache();
}

export function removeIncidentDraft(id: string): void {
  const list = readDrafts().filter((d) => d.id !== id);
  storageSet(storageKeys.incidentDrafts, list);
  notifyLocalCache();
}

/* --- État synchronisation --- */

export function getLocalSyncState(): LocalSyncState {
  return storageGet<LocalSyncState>(storageKeys.syncState) ?? defaultSyncState();
}

export function setLocalSyncState(state: LocalSyncState): void {
  storageSet(storageKeys.syncState, state);
  notifyLocalCache();
}

export function patchLocalSyncState(patch: Partial<LocalSyncState>): void {
  const next = { ...getLocalSyncState(), ...patch };
  storageSet(storageKeys.syncState, next);
  notifyLocalCache();
}

/** Alias métier pour l’affichage Compte (compat ancien reportSyncStatus). */
export function setLocalSyncDisplayStatus(status: AccountSyncDisplayStatus): void {
  patchLocalSyncState({ displayStatus: status });
}

/** Snapshot pour le hook (lecture stable). */
export function getOfflineCacheSnapshot(): {
  session: LocalSessionSnapshot | null;
  recentMissions: CachedRecentMission[];
  recentVehicles: CachedRecentVehicle[];
  pendingDrafts: number;
  sync: LocalSyncState;
} {
  return {
    session: getLocalSessionSnapshot(),
    recentMissions: getRecentMissions(),
    recentVehicles: getRecentVehicles(),
    pendingDrafts: countPendingIncidentDrafts(),
    sync: getLocalSyncState(),
  };
}
