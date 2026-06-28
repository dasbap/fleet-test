import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { useOfflineStore } from "../../hooks/useOfflineStore";

export default function ShiftCloseScreen() {
  const { enqueueAction } = useOfflineStore();
  const [shiftId, setShiftId] = useState("");
  const [kmEnd, setKmEnd] = useState("");
  const [revenue, setRevenue] = useState("");

  const handleSubmit = async () => {
    const km = Number(kmEnd);
    const rev = Number(revenue);
    if (!shiftId || !Number.isFinite(km) || !Number.isFinite(rev)) {
      Alert.alert("Erreur", "Champs invalides.");
      return;
    }
    await enqueueAction("shift:close", {
      shiftId,
      kmEnd: km,
      revenueDeclared: rev,
      collectionMode: "cash",
      proofType: "momo_ref",
      proofValue: "offline-close",
    });
    Alert.alert("Enregistré", "Clôture enregistrée hors ligne.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>ID créneau</Text>
      <TextInput style={styles.input} value={shiftId} onChangeText={setShiftId} />
      <Text style={styles.label}>KM fin</Text>
      <TextInput style={styles.input} value={kmEnd} onChangeText={setKmEnd} keyboardType="numeric" />
      <Text style={styles.label}>Recette déclarée (XOF)</Text>
      <TextInput style={styles.input} value={revenue} onChangeText={setRevenue} keyboardType="numeric" />
      <Pressable style={styles.button} onPress={() => void handleSubmit()}>
        <Text style={styles.buttonText}>Clôturer</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8, backgroundColor: "#0f172a" },
  label: { color: "#cbd5e1", marginTop: 8 },
  input: { backgroundColor: "#1e293b", color: "#f8fafc", borderRadius: 8, padding: 12 },
  button: { marginTop: 16, backgroundColor: "#f59e0b", padding: 16, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
