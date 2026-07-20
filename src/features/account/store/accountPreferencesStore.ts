import { useSyncExternalStore } from "react";
import type { AccountLanguageCode, AccountPreferencesState } from "@/types/account-preferences";

const defaultState: AccountPreferencesState = {
  notificationsEnabled: true,
  language: "fr",
};

let state: AccountPreferencesState = { ...defaultState };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AccountPreferencesState {
  return state;
}

export function useAccountPreferencesState(): AccountPreferencesState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getAccountPreferencesSnapshot(): AccountPreferencesState {
  return state;
}

export function setNotificationsEnabled(value: boolean): void {
  state = { ...state, notificationsEnabled: value };
  emit();
}

export function setAccountLanguage(lang: AccountLanguageCode): void {
  state = { ...state, language: lang };
  emit();
}

/** Réinitialise (tests). */
export function resetAccountPreferencesStore(): void {
  state = { ...defaultState };
  emit();
}
