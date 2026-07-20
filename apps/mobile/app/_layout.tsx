import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";
import { OfflineStoreProvider } from "../hooks/useOfflineStore";

export default function RootLayout() {
  return (
    <AuthProvider>
      <OfflineStoreProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#0f172a" },
            headerTintColor: "#f1f5f9",
            contentStyle: { backgroundColor: "#0f172a" },
          }}
        />
      </OfflineStoreProvider>
    </AuthProvider>
  );
}
