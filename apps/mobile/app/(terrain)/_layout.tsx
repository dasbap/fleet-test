import { Stack, Redirect } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";

export default function TerrainLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#f1f5f9",
        contentStyle: { backgroundColor: "#0f172a" },
      }}
    />
  );
}
