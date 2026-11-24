import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import LoginScreen from "./src/screens/LoginScreen";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  // show login until the user signs in
  if (!loggedIn) {
    return (
      <>
        <LoginScreen onLoggedIn={() => setLoggedIn(true)} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Text>You are logged in.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
