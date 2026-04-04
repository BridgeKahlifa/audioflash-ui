import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ animation: "none", gestureEnabled: false }} />
      <Stack.Screen name="name" options={{ animation: "none" }} />
      <Stack.Screen name="target-languages" options={{ animation: "none" }} />
    </Stack>
  );
}
