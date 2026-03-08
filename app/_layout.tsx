import "../global.css";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
        <Stack.Screen
          name="lesson-ready/[topic]"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="practice/[topic]"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="session-summary"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen name="history" options={{ animation: "fade" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
