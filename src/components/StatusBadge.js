import { Text, StyleSheet } from "react-native";

// color per status group from the api (status_tag)
const COLORS = {
  ongoing: { bg: "#fff3e0", text: "#ef6c00" },
  approved: { bg: "#e8f5e9", text: "#2e7d32" },
  disapproved: { bg: "#ffebee", text: "#c62828" },
  unknown: { bg: "#eceff1", text: "#546e7a" },
};

export default function StatusBadge({ tag, label }) {
  const color = COLORS[tag] || COLORS.unknown;

  return <Text style={[styles.badge, { backgroundColor: color.bg, color: color.text }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
  },
});
