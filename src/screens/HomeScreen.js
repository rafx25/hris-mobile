import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { apiGet, apiPost, setCsrfToken } from "../api";

// today as YYYY-MM-DD in the phones's local time
function today() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export default function HomeScreen({ onLoggedOut }) {
  const [name, setName] = useState("");
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // load user name, csrf token and leave credits
  async function loadData() {
    setError("");
    try {
      const me = await apiGet("auth/routes");
      if (!me.status) {
        // session is gone, back to login
        onLoggedOut();
        return;
      }

      setName(me.welcome_name);
      setCsrfToken(me.csrf_token);

      // account still has a required step on the web (2fa setup, password, privacy)
      if (me.must_setup_2fa || me.must_change_password || me.must_accept_privacy_policy) {
        setError("Finish your account setup on the HRIS website first, then sign in again.");
        return;
      }

      const res = await apiGet("leave_application/credits_as_of?as_of=" + today());
      if (!res.status) {
        setError(res.message || "Cannot load leave credits.");
        return;
      }

      // skip leave types with no balance and nothing pending
      const rows = res.data.filter((item) => Number(item.available_as_of) !== 0 || Number(item.pending_days) > 0);
      setCredits(rows);
    } catch (e) {
      setError("Cannot reach the server. Pull down to try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // end the session on the server, then go back to login
  async function handleLogout() {
    try {
      await apiPost("auth/logout", {});
    } catch (e) {
      // still leave the screen even if the server is down
    }
    onLoggedOut();
  }

  function handleRefresh() {
    setRefreshing(true);
    loadData();
  }

  // first load when the screen opens
  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={credits}
      keyExtractor={(item) => String(item.leave_type_id)}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      ListHeaderComponent={
        <View>
          <Text style={styles.hello}>Hi, {name}!</Text>
          <Text style={styles.sub}>Leave credits as of {today()}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={error ? null : <Text style={styles.sub}>No leave credits yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{item.leave_name}</Text>
          <Text style={styles.balance}>{Number(item.available_as_of).toFixed(3)}</Text>
          <Text style={styles.sub}>availabe:</Text>
          {Number(item.pending_days) > 0 ? <Text style={styles.pending}>{item.pending_days} day(s) pending</Text> : null}
        </View>
      )}
      ListFooterComponent={
        <Pressable style={styles.logout} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16 },
  hello: { fontSize: 22, fontWeight: "bold" },
  sub: { color: "#666", marginBottom: 12 },
  error: { color: "#c62828", marginBottom: 12 },
  card: { backgroundColor: "#f5f7fa", borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  balance: { fontSize: 28, fontWeight: "bold", color: "#1565c0", marginTop: 8 },
  pending: { color: "#ef6c00", marginTop: 4 },
  logout: { marginTop: 24, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: "#c62828", alignItems: "center" },
  logoutText: { color: "#c62828", fontWeight: "bold" },
});
