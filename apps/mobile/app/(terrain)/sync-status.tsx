import { View, Text, Pressable, StyleSheet } from "react-native";
import { useOfflineStore } from "../../hooks/useOfflineStore";

export default function SyncStatusScreen() {
  const { stats, isOnline, isFlushing, flush } = useOfflineStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Synchronisation</Text>
      <Text style={styles.row}>Réseau : {isOnline ? "En ligne" : "Hors ligne"}</Text>
      <Text style={styles.row}>En attente : {stats.pending}</Text>
      <Text style={styles.row}>En cours : {stats.syncing}</Text>
      <Text style={styles.row}>Échecs / conflits : {stats.failed}</Text>
      <Pressable
        style={[styles.button, isFlushing && styles.buttonDisabled]}
        onPress={() => void flush()}
        disabled={isFlushing}
      >
        <Text style={styles.buttonText}>{isFlushing ? "Sync..." : "Synchroniser"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, backgroundColor: "#0f172a" },
  title: { fontSize: 22, fontWeight: "700", color: "#f8fafc" },
  row: { color: "#cbd5e1", fontSize: 16 },
  button: { marginTop: 24, backgroundColor: "#00C853", padding: 16, borderRadius: 12, alignItems: "center" },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
