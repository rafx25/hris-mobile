import { useEffect, useState } from "react";
import { ScrollView, View, Text, TextInput, Pressable, ActivityIndicator, Alert, StyleSheet } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { apiGet, apiPostForm } from "../api";
import { toYmd } from "../dates";

// leave types that always ask for a reason
const REASON_TYPE = [110];

// leave ids and detail id used by the attachment rules
const SICK_LEAVE = 102;
const MATERNITY_LEAVE = 103;
const SPECIAL_LEAVE_WOMEN = 110;
const WELLNESS_LEAVE = 113;
const ABROAD_DETAIL = 201;

// server sends a message as text or as a list of text
function messageText(res) {
  if (Array.isArray(res.message)) return res.message.join("\n");
  return res.message || res.error || "Something went wrong.";
}

export default function FileLeaveScreen({ navigation, onLoggedOut }) {
  const [types, setTypes] = useState([]);
  const [typeId, setTypeId] = useState(null);
  const [details, setDetails] = useState([]);
  const [detailId, setDetailId] = useState(null);
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date());
  const [picking, setPicking] = useState(null);
  const [halfDay, setHalfDay] = useState(false);
  const [amPm, setAmPm] = useState("AM");
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);

  // leave types for the picker
  useEffect(() => {
    loadTypes();
  }, []);

  async function loadTypes() {
    try {
      const res = await apiGet("fetch/get_leave_type_list");
      if (Array.isArray(res)) {
        setTypes(res);
      } else if (res.error === "Session Timeout") {
        onLoggedOut();
      } else {
        setError(messageText(res));
      }
    } catch (e) {
      setError("Cannot reach the server.");
    } finally {
      setLoading(false);
    }
  }

  // details change every time a new leave type is picked
  useEffect(() => {
    if (!typeId) return;
    setDetailId(null);
    setFile(null);
    apiGet(`leave_application/leave_detail_selection?leave_type_id=${typeId}`)
      .then((res) => setDetails(res.status ? res.data : []))
      .catch(() => setDetails([]));
  }, [typeId]);

  // ask the server how many days, it knows holidays and work schedule
  useEffect(() => {
    if (!typeId) return;
    if (halfDay) {
      setDays(0.5);
      return;
    }
    apiGet(`leave_application/compute_days?start_date=${toYmd(start)}&end_date=${toYmd(end)}&leave_type_id=${typeId}`)
      .then((res) => {
        if (res.status) {
          setDays(Number(res.data.total_days));
          setError("");
        } else {
          setDays(0);
          setError(messageText(res));
        }
      })
      .catch(() => setDays(0));
  }, [typeId, start, end, halfDay]);

  // a date was picked, save it to start or end
  function handleDate(event, date) {
    const field = picking;
    setPicking(null);
    if (!date) return;

    if (field === "start") {
      setStart(date);
      if (toYmd(date) > toYmd(end)) setEnd(date);
    } else {
      setEnd(toYmd(date) < toYmd(start) ? start : date);
    }
  }

  // let the user pick a pdf or photo from the phone
  async function pickFile() {
    const pdfOnly = typeId === MATERNITY_LEAVE;
    const result = await DocumentPicker.getDocumentAsync({
      type: pdfOnly ? "application/pdf" : ["image/jpeg", "image/png", "application/pdf"],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const picked = result.assets[0];
    const maxMb = pdfOnly ? 5 : 3;
    if (picked.size > maxMb * 1024 * 1024) {
      setError(`File is too big. Max ${maxMb} MB.`);
      return;
    }
    setError("");
    setFile(picked);
  }

  async function handleSubmit() {
    if (!typeId) {
      setError("Pick a leave type");
      return;
    }

    if (needsFile && !file) {
      setError("Attach a file for this leave.");
      return;
    }

    setSending(true);
    setError("");
    try {
      const form = new FormData();
      form.append("leave_type_id", String(typeId));
      form.append("leave_detail_id", detailId ? String(detailId) : "");
      form.append("start_date", toYmd(start));
      form.append("end_date", toYmd(halfDay ? start : end));
      form.append("total_days", String(days));
      form.append("day_type", halfDay ? "HALF" : "WHOLE");
      form.append("am_pm", halfDay ? amPm : "");
      form.append("location_reason", reason);
      if (file) {
        form.append("attachment", { uri: file.uri, name: file.name, type: file.mimeType });
      }

      const res = await apiPostForm("leave_application/submit_leave_request", form);

      if (res.status) {
        Alert.alert("Leave filed", messageText(res));
        navigation.replace("Requests");
      } else if (res.error === "Session Timeout") {
        onLoggedOut();
      } else {
        setError(messageText(res));
      }
    } catch (e) {
      console.log(e);
      setError("Cannot reach the server. Try again.");
    } finally {
      setSending(false);
    }
  }

  const detail = details.find((d) => Number(d.leave_detail_id) === detailId);
  const metaType = (detail?.meta_type || "").toUpperCase();
  const needsReason = REASON_TYPE.includes(typeId) || metaType === "LOCATION" || metaType === "REASON";
  const reasonLabel = metaType === "LOCATION" ? "Location" : "Reason";
  const needsFile = (typeId === SICK_LEAVE && days >= 5) || typeId === MATERNITY_LEAVE || typeId === SPECIAL_LEAVE_WOMEN || (detailId === ABROAD_DETAIL && typeId !== WELLNESS_LEAVE);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Leave Type</Text>
      <View style={styles.chips}>
        {types.map((t) => (
          <Chip
            key={t.id} //
            label={t.name}
            active={Number(t.id) === typeId}
            onPress={() => setTypeId(Number(t.id))}
          />
        ))}
      </View>

      {details.length > 0 ? (
        <>
          <Text style={styles.label}>Details</Text>
          <View style={styles.chips}>
            {details.map((d) => (
              <Chip
                key={d.leave_detail_id} //
                label={d.detail}
                active={Number(d.leave_detail_id) === detailId}
                onPress={() => setDetailId(Number(d.leave_detail_id))}
              />
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.label}>Day Type</Text>
      <View style={styles.chips}>
        <Chip label="Whole Day" active={!halfDay} onPress={() => setHalfDay(false)} />
        <Chip label="Half Day" active={halfDay} onPress={() => setHalfDay(true)} />
        {halfDay ? <Chip label="AM" active={amPm === "AM"} onPress={() => setAmPm("AM")} /> : null}
        {halfDay ? <Chip label="PM" active={amPm === "PM"} onPress={() => setAmPm("PM")} /> : null}
      </View>

      <Text style={styles.label}>{halfDay ? "Date" : "Start Date"}</Text>
      <Pressable style={styles.input} onPress={() => setPicking("start")}>
        <Text>{toYmd(start)}</Text>
      </Pressable>

      {!halfDay ? (
        <>
          <Text style={styles.label}>End Date</Text>
          <Pressable style={styles.input} onPress={() => setPicking("end")}>
            <Text>{toYmd(end)}</Text>
          </Pressable>
        </>
      ) : null}

      {picking ? <DateTimePicker value={picking === "start" ? start : end} mode="date" onValueChange={handleDate} onDismiss={() => setPicking(null)} /> : null}

      {needsReason ? (
        <>
          <Text style={styles.label}>{reasonLabel}</Text>
          <TextInput style={styles.input} value={reason} onChangeText={setReason} placeholder={`Enter ${reasonLabel.toLowerCase()}`} multiline />
        </>
      ) : null}

      <Text style={styles.label}>Attachment {needsFile ? "(required)" : "(optional)"}</Text>
      {file ? (
        <View style={styles.fileRow}>
          <Text style={styles.fileName} numberOfLines={1}>
            {file.name}
          </Text>
          <Pressable onPress={() => setFile(null)}>
            <Text style={styles.remove}>Remove</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.input} onPress={pickFile}>
          <Text style={styles.pickText}>{typeId === MATERNITY_LEAVE ? "Choose PDF (max 5 MB)" : "Choose JPG, PNG, or PDF (max 3 MB)"}</Text>
        </Pressable>
      )}

      <Text style={styles.days}>Total: {days} day(s)</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={[styles.button, sending && styles.buttonOff]} onPress={handleSubmit} disabled={sending}>
        {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit</Text>}
      </Pressable>
    </ScrollView>
  );
}

// samll pill button for picking one choice
function Chip({ label, active, onPress }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 16, paddingBottom: 40 },
  label: { color: "#666", fontSize: 12, marginTop: 16, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: "#cfd8dc", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: "#1565c0", borderColor: "#1565c0" },
  chipText: { color: "#333" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#cfd8dc", borderRadius: 8, padding: 12 },
  days: { fontSize: 16, fontWeight: "600", marginTop: 20 },
  error: { color: "#c62828", marginTop: 8 },
  button: { backgroundColor: "#1565c0", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 20 },
  buttonOff: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  fileRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#cfd8dc", borderRadius: 8, padding: 12 },
  fileName: { flex: 1, marginRight: 12 },
  remove: { color: "#c62828", fontWeight: "600" },
  pickText: { color: "#1565c0" },
});
