"use client";

import { useSyncExternalStore } from "react";

let cachedNowMs: number | null = null;

function getClientNowMs(): number {
  if (cachedNowMs === null) {
    cachedNowMs = Date.now();
  }
  return cachedNowMs;
}

function subscribe(): () => void {
  return () => {};
}

/** Horodatage client figé au premier rendu (calcul « jours restants »). */
export function useNowMs(): number {
  return useSyncExternalStore(subscribe, getClientNowMs, () => 0);
}
