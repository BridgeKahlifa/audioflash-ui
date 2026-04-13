import "../global.css";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Stack, router, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { PostHogErrorBoundary, PostHogProvider, usePostHog } from "posthog-react-native";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { ConfigProvider } from "../lib/config-context";
import { AppDataProvider, useAppData } from "../lib/app-data-context";
import { SplashScreen } from "../components/SplashScreen";
import { AppThemeProvider, useAppTheme } from "../lib/theme-context";
import {
  buildExceptionProperties,
  POSTHOG_ENABLE_ERROR_TRACKING,
  POSTHOG_ENABLE_SESSION_REPLAY,
  POSTHOG_HOST,
  POSTHOG_KEY,
} from "../lib/analytics";
import { queryClient, QUERY_CACHE_PERSIST_KEY } from "../lib/query-client";
import { SUPABASE_CONFIG_ERROR } from "../lib/supabase";

const DAY_MS = 24 * 60 * 60 * 1000;

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: QUERY_CACHE_PERSIST_KEY,
  throttleTime: 1000,
});

function RootErrorFallback() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", color: "#1f2937", marginBottom: 8 }}>
        Something went wrong
      </Text>
      <Text style={{ fontSize: 15, color: "#4b5563", textAlign: "center" }}>
        Restart the app and try again.
      </Text>
    </View>
  );
}

function ConfigurationErrorScreen({ message }: { message: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#fff7ed", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <View style={{ width: "100%", maxWidth: 360, backgroundColor: "#ffffff", borderRadius: 24, padding: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 10 }}>
          Something Went Wrong
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: "#4b5563", marginBottom: 16 }}>
          AudioFlash could not start correctly.
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 21, color: "#9a3412", marginBottom: 16 }}>
          Please try again in a moment. If the problem continues, reinstall the app or contact support.
        </Text>
        <Text style={{ fontSize: 13, lineHeight: 20, color: "#6b7280" }}>
          {message}
        </Text>
      </View>
    </View>
  );
}

function RootNavigator() {
  const { session, loading, isDevAuth, profile, profileLoading, profileError } = useAuth();
  const { ready: appDataReady } = useAppData();
  const segments = useSegments();
  const posthog = usePostHog();
  const hasTrackedOpen = useRef(false);
  const prevSessionId = useRef<string | null>(null);
  const [splashMounted, setSplashMounted] = useState(true);

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
        is_dev_auth: isDevAuth,
      });
    }
    prevSessionId.current = session?.user?.id ?? null;
  }, [loading, session?.user?.id]);

  const isAuthenticated = !!(session || isDevAuth);
  const profilePending = isAuthenticated && profile === null && profileLoading && !profileError;
  const showSplash = loading || profilePending || (isAuthenticated && !appDataReady);

  useEffect(() => {
    console.log("[startup][RootNavigator]", {
      loading,
      isDevAuth,
      hasSession: !!session,
      hasProfile: !!profile,
      profileLoading,
      profileError: profileError ?? null,
      appDataReady,
      isAuthenticated,
      profilePending,
      showSplash,
      segments,
    });
  }, [
    loading,
    isDevAuth,
    !!session,
    !!profile,
    profileLoading,
    profileError,
    appDataReady,
    isAuthenticated,
    profilePending,
    showSplash,
    segments,
  ]);

  // Derive mount state synchronously during render — not in a useEffect.
  // A useEffect fires after paint, creating a race where fast queries (e.g.
  // profile) resolve before the splash ever mounts, so it never appears.
  // By ORing with showSplash, the component is guaranteed to be in the tree
  // the moment it's needed. onHidden() sets splashMounted=false once the
  // fade-out completes and showSplash is already false.
  const effectiveSplashMounted = splashMounted || showSplash;

  useEffect(() => {
    if (loading || profilePending) return;

    const inAuthGroup = segments[0] === "(auth)" || segments[0] === "auth";
    const inOnboardingGroup = segments[0] === "(onboarding)";
    const needsOnboarding = profile != null && !profile.onboarding_completed;

    console.log("[startup][redirect-check]", {
      isAuthenticated,
      loading,
      profilePending,
      inAuthGroup,
      inOnboardingGroup,
      needsOnboarding,
      segments,
    });

    if (!isAuthenticated && !inAuthGroup) {
      console.log("[startup][redirect]", "/(auth)/sign-in");
      router.replace("/(auth)/sign-in");
    } else if (isAuthenticated && inAuthGroup) {
      console.log("[startup][redirect]", needsOnboarding ? "/(onboarding)" : "/(tabs)");
      router.replace(needsOnboarding ? "/(onboarding)" : "/(tabs)");
    } else if (isAuthenticated && needsOnboarding && !inOnboardingGroup) {
      console.log("[startup][redirect]", "/(onboarding)");
      router.replace("/(onboarding)");
    } else if (isAuthenticated && !needsOnboarding && inOnboardingGroup) {
      console.log("[startup][redirect]", "/(tabs)");
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, loading, profilePending, segments, profile?.onboarding_completed]);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
        <Stack.Screen name="generate" options={{ animation: "none" }} />
        <Stack.Screen name="lesson-ready/[topic]" options={{ animation: "none" }} />
        <Stack.Screen name="practice/[topic]" options={{ animation: "none" }} />
        <Stack.Screen name="session-summary" options={{ animation: "none" }} />
        <Stack.Screen name="history" options={{ animation: "none" }} />
        <Stack.Screen name="browse-languages" options={{ animation: "none" }} />
        <Stack.Screen name="my-library" options={{ animation: "none" }} />
        <Stack.Screen name="decks/index" options={{ animation: "none" }} />
        <Stack.Screen name="decks/new" options={{ animation: "none" }} />
        <Stack.Screen name="decks/[id]" options={{ animation: "none" }} />
        <Stack.Screen name="decks/[id]/edit" options={{ animation: "none" }} />
        <Stack.Screen name="decks/[id]/add-card" options={{ animation: "none" }} />
        <Stack.Screen name="decks/[id]/generate" options={{ animation: "none" }} />
        <Stack.Screen name="decks/[id]/practice-ready" options={{ animation: "none" }} />
      </Stack>
      {effectiveSplashMounted && (
        <SplashScreen visible={showSplash} onHidden={() => setSplashMounted(false)} />
      )}
    </View>
  );
}

function ThemedAppShell() {
  const { statusBarStyle } = useAppTheme();

  if (SUPABASE_CONFIG_ERROR) {
    return (
      <>
        <StatusBar style={statusBarStyle} />
        <ConfigurationErrorScreen message={SUPABASE_CONFIG_ERROR} />
      </>
    );
  }

  return (
    <>
      <StatusBar style={statusBarStyle} />
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: DAY_MS }}
      >
        <PostHogProvider
          apiKey={POSTHOG_KEY}
          options={{
            host: POSTHOG_HOST,
            disabled: !POSTHOG_KEY,
            captureAppLifecycleEvents: true,
            enableSessionReplay: POSTHOG_ENABLE_SESSION_REPLAY,
            errorTracking: POSTHOG_ENABLE_ERROR_TRACKING
              ? {
                autocapture: true,
              }
              : undefined,
            sessionReplayConfig: POSTHOG_ENABLE_SESSION_REPLAY
              ? {
                maskAllTextInputs: true,
                maskAllImages: true,
                maskAllSandboxedViews: true,
                captureLog: true,
                captureNetworkTelemetry: true,
                sampleRate: __DEV__ ? 1 : 0.2,
              }
              : undefined,
          }}
        >
          <PostHogErrorBoundary
            fallback={RootErrorFallback}
            additionalProperties={{ error_boundary: "root_layout" }}
          >
            <ConfigProvider>
              <AuthProvider>
                <AppDataProvider>
                  <RootNavigator />
                </AppDataProvider>
              </AuthProvider>
            </ConfigProvider>
          </PostHogErrorBoundary>
        </PostHogProvider>
      </PersistQueryClientProvider>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <ThemedAppShell />
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}
