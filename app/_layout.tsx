import "../global.css";
import { useEffect } from "react";
import { Stack, router, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../lib/auth-context";

function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
      <Stack.Screen name="lesson-ready/[topic]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="practice/[topic]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="session-summary" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="history" options={{ animation: "fade" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
