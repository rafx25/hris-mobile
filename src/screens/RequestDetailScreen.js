import { ScrollView, View, Text, StyleSheet } from "react-native";
import StatusBadge from "../components/StatusBadge";

export default function RequestDetailScreen({ route }) {
  const { request } = route.params;
  const logs = request.approval_logs || [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{request.leave_name}</Text>
      <StatusBadge tag={request.status_tag} label={request.status_desc} />

      <View style={styles.section}>
        <Row label="Reference No." value={request.ref_no} />
        <Row label="Dates" value={request.leave_date_range} />
        <Row label="Days" value={request.days_log} />
        <Row label="Details" value={request.leave_detail_name} />
        <Row label="Location / Reason" value={request.location_reason} />
        <Row label="Filed on" value={request.created_at} />
      </View>

      <Text style={styles.subtitle}>Approval History</Text>
      {logs.length === 0 ? <Text style={styles.muted}>No actions yet.</Text> : null}

      {logs.map((log, index) => (
        <View key={index} style={[styles.log, { borderLeftColor: decisionColor(log.decision) }]}>
          <Text style={styles.logName}>{log.approved_by_name || log.actor_label}</Text>
          <Text style={styles.muted}>{log.actor_label}</Text>
          {log.remarks ? <Text>{log.remarks.trim()}</Text> : null}
          <Text style={styles.muted}>{log.created_at}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// one label and value line, hidden when there is no value
function Row({ label, value }) {
  if (!value) {
    return null;
  }
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

// green for approved, red for disapproved, gray for other actions
function decisionColor(decision) {
  if (String(decision) === "0") return "#2e7d32";
  if (String(decision) === "1") return "#c62828";
  return "#b0bec5";
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  section: { backgroundColor: "#f5f7fa", borderRadius: 12, padding: 16, marginVertical: 16 },
  row: { marginBottom: 10 },
  label: { color: "#666", fontSize: 12 },
  value: { fontSize: 15 },
  subtitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  muted: { color: "#888", fontSize: 12 },
  log: { borderLeftWidth: 4, paddingLeft: 12, paddingVertical: 8, marginBottom: 12 },
  logName: { fontWeight: "600" },
});
