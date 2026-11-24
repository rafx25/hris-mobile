import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Switch, Alert, StyleSheet } from "react-native";
import { apiGet, apiPost } from "../api";
import { canUseBiometric, biometricLabel, hasSavedLogin, saveLogin, clearLogin, getLoginWithBiometric } from "../biometric";

export default function LoginScreen({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(false);
  const [step, setStep] = useState("password"); // 'password' or 'code'
  const [csrf, setCsrf] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bioLabel, setBioLabel] = useState(""); // empty means no biometric button

  // show the biometric button only if the phone has a lock and a login is saved
  useEffect(() => {
    async function checkBiometric() {
      if ((await canUseBiometric()) && (await hasSavedLogin())) {
        setBioLabel(await biometricLabel());
      }
    }
    checkBiometric();
  }, []);

  // step 1: send username and password
  async function login(user, pass, fromBiometric) {
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const token = await apiGet("auth/csrf_token");
      setCsrf(token.token);

      const data = await apiPost("auth/login", {
        username: user,
        password: pass,
        csrf_token: token.token,
      });

      if (data.status && data.requires_2fa) {
        // keep these for saving the login after the code step
        setUsername(user);
        setPassword(pass);
        setStep("code");

        if (data.message) {
          setInfo(data.message);
        } else if (data.method === "email") {
          setInfo("Check your email for the code.");
        } else {
          setInfo("Enter the code from your authenticator app.");
        }
      } else if (data.status) {
        await finishLogin(user, pass, fromBiometric);
      } else {
        if (fromBiometric) {
          // saved password no longer works, make the user type it again
          await clearLogin();
          setBioLabel("");
        }
        setError(Array.isArray(data.message) ? data.message.join("\n") : data.message);
      }
    } catch (e) {
      setError("Cannot reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  // step 2: send the 2FA code
  async function verifyCode() {
    if (!code) {
      setError("Enter the code.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const data = await apiPost("auth/verify_2fa", {
        code,
        csrf_token: csrf,
        remember: remember ? "1" : "0",
      });

      if (data.status) {
        await finishLogin(username, password, false);
      } else if (data.expired) {
        backToPassword();
        setError(data.message);
      } else {
        setError(data.message);
      }
    } catch (e) {
      setError("Cannot reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  // send a new code to the user's email
  async function resendCode() {
    setError("");
    try {
      const data = await apiPost("auth/resend_2fa", { csrf_token: csrf });
      if (data.expired) {
        backToPassword();
        setError(data.message);
      } else if (data.status) {
        setInfo(data.message || "A new code was sent to your email.");
      } else {
        setError(data.message);
      }
    } catch (e) {
      setError("Cannot reach the server. Check your connection.");
    }
  }

  function backToPassword() {
    setStep("password");
    setCode("");
    setInfo("");
  }

  // after a good login: keep the saved login fresh, or offer to turn on biometric
  async function finishLogin(user, pass, fromBiometric) {
    if (fromBiometric) {
      onLoggedIn();
      return;
    }

    if (await hasSavedLogin()) {
      await saveLogin(user, pass);
      onLoggedIn();
      return;
    }

    if (!(await canUseBiometric())) {
      onLoggedIn();
      return;
    }

    Alert.alert("Faster sign-in", "Use your fingerprint, face or phone lock next time?", [
      { text: "Not now", style: "cancel", onPress: onLoggedIn },
      {
        text: "Enable",
        onPress: async () => {
          await saveLogin(user, pass);
          onLoggedIn();
        },
      },
    ]);
  }

  function handleLogin() {
    if (!username || !password) {
      setError("Enter your username and password.");
      return;
    }
    login(username, password, false);
  }

  async function handleBiometric() {
    const saved = await getLoginWithBiometric();
    if (!saved) {
      return; // user cancelled
    }
    login(saved.username, saved.password, true);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HRIS Mobile</Text>

      {step === "password" ? (
        <>
          <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        </>
      ) : (
        <>
          {info ? <Text style={styles.info}>{info}</Text> : null}
          <TextInput style={styles.input} placeholder="Code or backup code" value={code} onChangeText={setCode} autoCapitalize="none" autoFocus />
          <View style={styles.row}>
            <Switch value={remember} onValueChange={setRemember} />
            <Text style={styles.rowText}>Remember this phone for 15 days</Text>
          </View>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={step === "password" ? handleLogin : verifyCode} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{step === "password" ? "Sign in" : "Verify"}</Text>}
      </Pressable>

      {step === "password" && bioLabel ? (
        <Pressable style={styles.linkButton} onPress={handleBiometric} disabled={loading}>
          <Text style={styles.linkText}>{bioLabel}</Text>
        </Pressable>
      ) : null}

      {step === "code" ? (
        <>
          <Pressable style={styles.linkButton} onPress={resendCode}>
            <Text style={styles.linkText}>Email me a new code</Text>
          </Pressable>
          <Pressable style={styles.linkButton} onPress={backToPassword}>
            <Text style={styles.linkText}>Back</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 32, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 12 },
  info: { color: "#555", marginBottom: 12 },
  error: { color: "#c62828", marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  rowText: { marginLeft: 8 },
  button: { backgroundColor: "#1565c0", padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold" },
  linkButton: { padding: 12, alignItems: "center" },
  linkText: { color: "#1565c0", fontWeight: "600" },
});
