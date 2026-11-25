import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { apiGet } from "../api";
import StatusBadge from "../components/StatusBadge";

const PAGE_SIZE = 20;

export default function RequestsScreen({ navigation, onLoggedOut }) {
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  // fetch one page, offset 0 means start from the top
  async function loadPage(offset) {
    setError("");
    try {
      const res = await apiGet(`leave_application/app_dt?limit=${PAGE_SIZE}&limit_offset=${offset}`);

      if (!Array.isArray(res.data)) {
        if (res.error === "Session Timeout") {
          onLoggedOut();
          return;
        }
        setError(res.message || "Cannot load your requests.");
        return;
      }

      setTotal(res._total_count);
      if (offset === 0) {
        setRequests(res.data);
      } else {
        setRequests((old) => [...old, ...res.data]);
      }
    } catch (e) {
      setError("Cannot reach the server. Pull down to try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }

  // first load when the screen opens
  useEffect(() => {
    loadPage(0);
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    loadPage(0);
  }

  // load the next page when the user scrolls near the bottom
  function handleLoadMore() {
    if (loadingMore || requests.length >= total) {
      return;
    }
    setLoadingMore(true);
    loadPage(requests.length);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list} //
      data={requests}
      keyExtractor={(item) => String(item.leave_app_id)}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
      ListEmptyComponent={error ? null : <Text style={styles.empty}>No leave requests yet.</Text>}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.more} /> : null}
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => navigation.navigate("RequestDetail", { request: item })}>
          <View style={styles.cardTop}>
            <Text style={styles.leaveName}>{item.leave_name}</Text>
            <Text style={styles.days}>{item.days_log} day(s)</Text>
          </View>
          <Text style={styles.dates}>{item.leave_date_range}</Text>
          <StatusBadge tag={item.status_tag} label={item.status_desc} />
          <Text style={styles.ref}>{item.ref_no}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16 },
  error: { color: "#c62828", marginBottom: 12 },
  empty: { color: "#666", textAlign: "center", marginTop: 32 },
  more: { marginVertical: 16 },
  card: { backgroundColor: "#f5f7fa", borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  leaveName: { fontSize: 16, fontWeight: "600", flex: 1 },
  days: { color: "#1565c0", fontWeight: "600" },
  dates: { color: "#444", marginBottom: 8 },
  ref: { color: "#999", fontSize: 12, marginTop: 8 },
});
