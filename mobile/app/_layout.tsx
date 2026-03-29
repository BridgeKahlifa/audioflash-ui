import "../global.css";
import { useEffect, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, router, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { AuthModeBadge } from "../components/AuthModeBadge";
import { ConfigProvider } from "../lib/config-context";
import { POSTHOG_KEY, POSTHOG_HOST } from "../lib/analytics";

function RootNavigator() {
  const { session, loading, isDevAuth, profile, profileLoading, profileError } = useAuth();
  const segments = useSegments();
  const posthog = usePostHog();
  const hasTrackedOpen = useRef(false);
  const prevSessionId = useRef<string | null>(null);

  // Identify user in PostHog when they sign in; reset when signed out
  useEffect(() => {
    if (loading) return;
    if (session?.user) {
      posthog?.identify(session.user.id, {
        email: session.user.email,
        name: profile?.name,
        native_language_id: profile?.native_language_id,
        target_language_ids: profile?.target_language_ids,
        daily_goal: profile?.daily_goal,
        is_dev_auth: isDevAuth,
      });
    } else if (!isDevAuth) {
      posthog?.reset();
    }
  }, [session?.user?.id, profile?.id]);

  // Track app opens: fire once per launch when a session is ready
  useEffect(() => {
    if (loading || hasTrackedOpen.current) return;
    if (session?.user || isDevAuth) {
      hasTrackedOpen.current = true;
      const isNewSignIn = prevSessionId.current === null;
      posthog?.capture("app_opened", {
        is_new_sign_in: isNewSignIn,
        streak: profile?.streak_count ?? 0,
      });
    }
    prevSessionId.current = session?.user?.id ?? null;
  }, [loading, session?.user?.id]);

  const isAuthenticated = !!(session || isDevAuth);
  // Block until we know the user's onboarding status. If profile fails to load,
  // profileError lets us stop spinning rather than hanging forever.
  const profilePending = isAuthenticated && profile === null && !profileError;

  useEffect(() => {
    if (loading || profilePending) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";
    const needsOnboarding = profile != null && !profile.onboarding_completed;

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace(needsOnboarding ? "/(onboarding)" : "/(tabs)");
    } else if (isAuthenticated && needsOnboarding && !inOnboardingGroup) {
      router.replace("/(onboarding)");
    } else if (isAuthenticated && !needsOnboarding && inOnboardingGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, loading, profilePending, segments, profile?.onboarding_completed]);

  if (loading || profilePending) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FAFAF8", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#FF6B4A" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
      <Stack.Screen name="generate" options={{ animation: "none" }} />
      <Stack.Screen name="lesson-ready/[topic]" options={{ animation: "none" }} />
      <Stack.Screen name="practice/[topic]" options={{ animation: "none" }} />
      <Stack.Screen name="session-summary" options={{ animation: "none" }} />
      <Stack.Screen name="history" options={{ animation: "none" }} />
      <Stack.Screen name="browse-languages" options={{ animation: "none" }} />
      <Stack.Screen name="my-library" options={{ animation: "none" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <PostHogProvider apiKey={POSTHOG_KEY} options={{ host: POSTHOG_HOST, disabled: !POSTHOG_KEY }}>
        <ConfigProvider>
          <AuthProvider>
            <AuthModeBadge />
            <RootNavigator />
          </AuthProvider>
        </ConfigProvider>
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}
