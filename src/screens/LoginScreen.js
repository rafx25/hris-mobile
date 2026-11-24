import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { apiGet, apiPost } from "../api";

export default function LoginScreen({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // get csrf token first, then send the login request
  async function handleLogin() {
    if (!username || !password) {
      setError("Enter your username and password.");
      return;
    }

    setLoading(true);
    setError();

    try {
      const csrf = await apiGet("auth/csrf_token");
      const data = await apiPost("auth/login", {
        username,
        password,
        csrf_token: csrf.token,
      });

      if (data.status && data.requires_2fa) {
        setError("This account uses 2FA. Not supported yet.");
      } else if (data.status) {
        onLoggedIn();
      } else {
        // server sends either one message or a list
        setError(Array.isArray(data.message) ? data.message.join("\n") : data.message);
      }
    } catch (e) {
      setError("Cannot reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HRIS Mobile</Text>

      <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 32, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 12 },
  error: { color: "#c62828", marginBottom: 12 },
  button: { backgroundColor: "#1565c0", padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold" },
});
