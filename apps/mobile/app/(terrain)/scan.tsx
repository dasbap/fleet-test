import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useOfflineStore } from "../../hooks/useOfflineStore";

export default function ScanScreen() {
  const { user } = useAuth();
  const { enqueueAction, isOnline } = useOfflineStore();
  const [vehicleId, setVehicleId] = useState("");
  const [fleetId, setFleetId] = useState("");

  const handleScan = async () => {
    if (!user || !vehicleId || !fleetId) {
      Alert.alert("Erreur", "Scan invalide.");
      return;
    }
    await enqueueAction("scan:log", {
      fleetId,
      vehicleId,
      scannedBy: user.id,
      scannedAt: new Date().toISOString(),
      offline: !isOnline,
    });
    Alert.alert("Scan", isOnline ? "Scan enregistré" : "Scan offline — cache local utilisé");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        {isOnline ? "Mode en ligne" : "Mode hors ligne : résolution cache local"}
      </Text>
      <Text style={styles.label}>ID flotte</Text>
      <TextInput style={styles.input} value={fleetId} onChangeText={setFleetId} />
      <Text style={styles.label}>ID véhicule (QR)</Text>
      <TextInput style={styles.input} value={vehicleId} onChangeText={setVehicleId} />
      <Pressable style={styles.button} onPress={() => void handleScan()}>
        <Text style={styles.buttonText}>Valider scan</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8, backgroundColor: "#0f172a" },
  hint: { color: "#94a3b8", marginBottom: 8 },
  label: { color: "#cbd5e1", marginTop: 8 },
  input: { backgroundColor: "#1e293b", color: "#f8fafc", borderRadius: 8, padding: 12 },
  button: { marginTop: 16, backgroundColor: "#8b5cf6", padding: 16, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
