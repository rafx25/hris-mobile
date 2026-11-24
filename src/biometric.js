import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const LOGIN_KEY = "hris_login";

// true if the phone has any lock set up (fingerprint, face, pin, pattern)
export async function canUseBiometric() {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  return level !== LocalAuthentication.SecurityLevel.NONE;
}

// button text based on what the phone supports
export async function biometricLabel() {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return "Sign in with Face ID";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return "Sign in with Fingerprint";
  }
  return "Sign in with Phone Lock";
}

export async function hasSavedLogin() {
  const saved = await SecureStore.getItemAsync(LOGIN_KEY);
  return saved !== null;
}

export async function saveLogin(username, password) {
  await SecureStore.setItemAsync(LOGIN_KEY, JSON.stringify({ username, password }));
}

export async function clearLogin() {
  await SecureStore.deleteItemAsync(LOGIN_KEY);
}

// ask for fingerprint/face/pin, then return the saved login, or null if cancelled
export async function getLoginWithBiometric() {
  const result = await LocalAuthentication.authenticateAsync({
    promtMessage: "Sign in to HRIS",
  });

  if (!result.success) {
    return null;
  }

  const saved = await SecureStore.getItemAsync(LOGIN_KEY);
  return saved ? JSON.parse(saved) : null;
}
