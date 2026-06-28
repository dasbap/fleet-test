import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { useOfflineStore } from "../../hooks/useOfflineStore";

const actions = [
  { href: "/(terrain)/shift-open", label: "Ouvrir journée", color: "#00C853" },
  { href: "/(terrain)/shift-close", label: "Clôturer journée", color: "#f59e0b" },
  { href: "/(terrain)/incident", label: "Signaler incident", color: "#ef4444" },
  { href: "/(terrain)/dvir", label: "DVIR", color: "#3b82f6" },
  { href: "/(terrain)/scan", label: "Scanner QR", color: "#8b5cf6" },
  { href: "/(terrain)/sync-status", label: "Statut sync", color: "#64748b" },
] as const;

export default function TerrainHubScreen() {
  const { stats, isOnline } = useOfflineStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Terrain E-Samba</Text>
      <Text style={styles.subtitle}>
        {isOnline ? "En ligne" : "Hors ligne"} — {stats.pending} en attente
      </Text>
      {actions.map((action) => (
        <Link key={action.href} href={action.href} asChild>
          <Pressable style={[styles.button, { backgroundColor: action.color }]}>
            <Text style={styles.buttonText}>{action.label}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, backgroundColor: "#0f172a" },
  title: { fontSize: 28, fontWeight: "700", color: "#f8fafc", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#94a3b8", marginBottom: 16 },
  button: { paddingVertical: 18, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
