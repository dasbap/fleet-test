import { useEffect, useState } from "react";
import {
  getNetworkState,
  initNetworkStatus,
  subscribeNetworkStatus,
} from "@/lib/network/networkStatus";

/** État réseau fiable (Capacitor Network + fallback navigateur). */
export function useNetworkOnline(): boolean {
  const [online, setOnline] = useState(() => getNetworkState().isOnline);

  useEffect(() => {
    let unsub = () => {};
    void initNetworkStatus().then(() => {
      setOnline(getNetworkState().isOnline);
      unsub = subscribeNetworkStatus((state) => setOnline(state.isOnline));
    });
    return () => unsub();
  }, []);

  return online;
}
