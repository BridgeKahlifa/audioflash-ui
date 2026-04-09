import { Redirect } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { useAppData } from "../lib/app-data-context";

export default function Index() {
  const { session, loading, isDevAuth, profile, profileLoading, profileError } = useAuth();
  const { ready: appDataReady } = useAppData();

  const isAuthenticated = !!(session || isDevAuth);
  const profilePending = isAuthenticated && profile === null && profileLoading && !profileError;

  useEffect(() => {
    console.log("[startup][index]", {
      loading,
      isDevAuth,
      hasSession: !!session,
      hasProfile: !!profile,
      profileLoading,
      profileError: profileError ?? null,
      appDataReady,
      isAuthenticated,
      profilePending,
      onboardingCompleted: profile?.onboarding_completed ?? null,
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
    profile?.onboarding_completed,
  ]);

  if (loading || profilePending || (isAuthenticated && !appDataReady)) {
    console.log("[startup][index-decision]", "waiting");
    return null;
  }

  if (!isAuthenticated) {
    console.log("[startup][index-decision]", "/(auth)/sign-in");
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (profile && !profile.onboarding_completed) {
    console.log("[startup][index-decision]", "/(onboarding)");
    return <Redirect href="/(onboarding)" />;
  }

  console.log("[startup][index-decision]", "/(tabs)");
  return <Redirect href="/(tabs)" />;
}
