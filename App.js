import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import RequestsScreen from "./src/screens/RequestsScreen";
import RequestDetailScreen from "./src/screens/RequestDetailScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {loggedIn ? (
          <>
            <Stack.Screen name="Home" options={{ title: "Leave Credits" }}>
              {(props) => <HomeScreen {...props} onLoggedOut={() => setLoggedIn(false)} />}
            </Stack.Screen>
            <Stack.Screen name="Requests" options={{ title: "My Leave Requests" }}>
              {(props) => <RequestsScreen {...props} onLoggedOut={() => setLoggedIn(false)} />}
            </Stack.Screen>
            <Stack.Screen name="RequestDetail" component={RequestDetailScreen} options={{ title: "Request Details" }} />
          </>
        ) : (
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {(props) => <LoginScreen {...props} onLoggedIn={() => setLoggedIn(true)} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
