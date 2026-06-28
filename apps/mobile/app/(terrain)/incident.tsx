import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { useOfflineStore } from "../../hooks/useOfflineStore";
import { useAuth } from "../../contexts/AuthContext";

export default function IncidentScreen() {
  const { user } = useAuth();
  const { enqueueAction } = useOfflineStore();
  const [vehicleId, setVehicleId] = useState("");
  const [fleetId, setFleetId] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!user || !vehicleId || !fleetId || !description.trim()) {
      Alert.alert("Erreur", "Complétez tous les champs.");
      return;
    }
    await enqueueAction("incident:create", {
      fleetId,
      vehicleId,
      driverUserId: user.id,
      description: description.trim(),
      severity: "medium",
    });
    Alert.alert("Enregistré", "Incident enregistré hors ligne.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>ID flotte</Text>
      <TextInput style={styles.input} value={fleetId} onChangeText={setFleetId} />
      <Text style={styles.label}>ID véhicule</Text>
      <TextInput style={styles.input} value={vehicleId} onChangeText={setVehicleId} />
      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline />
      <Pressable style={styles.button} onPress={() => void handleSubmit()}>
        <Text style={styles.buttonText}>Signaler</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8, backgroundColor: "#0f172a" },
  label: { color: "#cbd5e1", marginTop: 8 },
  input: { backgroundColor: "#1e293b", color: "#f8fafc", borderRadius: 8, padding: 12 },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  button: { marginTop: 16, backgroundColor: "#ef4444", padding: 16, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
