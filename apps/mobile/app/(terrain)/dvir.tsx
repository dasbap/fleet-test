import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { useOfflineStore } from "../../hooks/useOfflineStore";
import { useAuth } from "../../contexts/AuthContext";

export default function DvirScreen() {
  const { user } = useAuth();
  const { enqueueAction } = useOfflineStore();
  const [fleetId, setFleetId] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  const handleSubmit = async () => {
    if (!user || !fleetId || !vehicleId) {
      Alert.alert("Erreur", "Champs requis manquants.");
      return;
    }
    await enqueueAction("dvir:create", {
      fleetId,
      vehicleId,
      inspectedBy: user.id,
      inspectionType: "pre_trip",
      items: { brakes: { status: "ok" }, lights: { status: "ok" } },
    });
    Alert.alert("Enregistré", "DVIR enregistré hors ligne.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>ID flotte</Text>
      <TextInput style={styles.input} value={fleetId} onChangeText={setFleetId} />
      <Text style={styles.label}>ID véhicule</Text>
      <TextInput style={styles.input} value={vehicleId} onChangeText={setVehicleId} />
      <Pressable style={styles.button} onPress={() => void handleSubmit()}>
        <Text style={styles.buttonText}>Enregistrer DVIR</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8, backgroundColor: "#0f172a" },
  label: { color: "#cbd5e1", marginTop: 8 },
  input: { backgroundColor: "#1e293b", color: "#f8fafc", borderRadius: 8, padding: 12 },
  button: { marginTop: 16, backgroundColor: "#3b82f6", padding: 16, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
