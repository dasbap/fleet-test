import { useSyncExternalStore } from "react";

/** État UI léger pour le client mobile (pas de persistance obligatoire). */
export interface MobileUiState {
  /** Dernier chemin d’onglet principal visité (pour restauration optionnelle). */
  lastMainTabPath: string | null;
}

let state: MobileUiState = {
  lastMainTabPath: null,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function getSnapshot(): MobileUiState {
  return state;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Met à jour le dernier onglet principal (ex. /dashboard/alerts). */
export function setLastMainTabPath(path: string | null): void {
  state = { ...state, lastMainTabPath: path };
  emit();
}

/** Hook lecture seule de l’état UI mobile. */
export function useMobileUiState(): MobileUiState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
