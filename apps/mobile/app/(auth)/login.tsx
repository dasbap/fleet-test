import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";

export default function LoginScreen() {
  const { user, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Redirect href="/(terrain)" />;
  }

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      Alert.alert("Connexion", e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>E-Samba Terrain</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#64748b"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        placeholderTextColor="#64748b"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable style={styles.button} onPress={() => void handleLogin()} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Connexion..." : "Se connecter"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12, backgroundColor: "#0f172a" },
  title: { fontSize: 28, fontWeight: "700", color: "#f8fafc", marginBottom: 16, textAlign: "center" },
  input: { backgroundColor: "#1e293b", color: "#f8fafc", borderRadius: 8, padding: 14 },
  button: { backgroundColor: "#00C853", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
