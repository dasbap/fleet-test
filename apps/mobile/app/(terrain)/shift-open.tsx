import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { useOfflineStore } from "../../hooks/useOfflineStore";

export default function ShiftOpenScreen() {
  const { enqueueAction } = useOfflineStore();
  const [assignmentId, setAssignmentId] = useState("");
  const [kmStart, setKmStart] = useState("");

  const handleSubmit = async () => {
    const km = Number(kmStart);
    if (!assignmentId || !Number.isFinite(km)) {
      Alert.alert("Erreur", "Renseignez l'affectation et le KM départ.");
      return;
    }
    await enqueueAction("shift:start", {
      assignmentId,
      kmStart: km,
    });
    Alert.alert("Enregistré", "Ouverture enregistrée hors ligne.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>ID affectation</Text>
      <TextInput style={styles.input} value={assignmentId} onChangeText={setAssignmentId} />
      <Text style={styles.label}>KM départ</Text>
      <TextInput style={styles.input} value={kmStart} onChangeText={setKmStart} keyboardType="numeric" />
      <Pressable style={styles.button} onPress={() => void handleSubmit()}>
        <Text style={styles.buttonText}>Enregistrer</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8, backgroundColor: "#0f172a" },
  label: { color: "#cbd5e1", marginTop: 8 },
  input: { backgroundColor: "#1e293b", color: "#f8fafc", borderRadius: 8, padding: 12 },
  button: { marginTop: 16, backgroundColor: "#00C853", padding: 16, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
