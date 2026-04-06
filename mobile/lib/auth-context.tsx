import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import {
  ApiProfile,
  ApiUpdateProfile,
  DEV_AUTH_MODE,
  fetchProfile,
  updateProfile,
  deleteAccount as apiDeleteAccount,
} from "./api";
import { syncSettingsFromProfile } from "./storage";
import { clearQueryCache, queryClient } from "./query-client";
import { queryKeys } from "./query-keys";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isDevAuth: boolean;
  // Profile
  profile: ApiProfile | null;
  profileLoading: boolean;
  profileError: string | null;
  updateProfileData: (updates: ApiUpdateProfile) => Promise<{ error: string | null }>;
  // OTP flow
  sendOtp: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  // Passkey flow
  passkeySupported: boolean;
  registerPasskey: () => Promise<{ error: string | null }>;
  signInWithPasskey: () => Promise<{ error: string | null }>;
  updateEmail: (email: string) => Promise<{ error: string | null }>;
  deleteAccount: () => Promise<{ error: string | null }>;
  // Session
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEV_USER_ID = process.env.EXPO_PUBLIC_DEV_USER_ID?.trim() || "dev-user";
const DEV_USER_EMAIL =
  process.env.EXPO_PUBLIC_DEV_USER_EMAIL?.trim() || "dev@audioflash.local";

type PasskeyModule = typeof import("react-native-passkey").Passkey;
type PasskeyCreateResult = import("react-native-passkey").PasskeyCreateResult;
type PasskeyGetResult = import("react-native-passkey").PasskeyGetResult;

function getPasskeyModule(): PasskeyModule | null {
  try {
    const passkeyModule = require("react-native-passkey") as { Passkey?: PasskeyModule };
    return passkeyModule.Passkey ?? null;
  } catch (error) {
    console.warn("[auth] Passkey native module unavailable", error);
    return null;
  }
}

function createDevSession(): Session {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return {
    access_token: "",
    refresh_token: "",
    token_type: "bearer",
    expires_in: 60 * 60 * 24 * 365,
    expires_at: nowSeconds + 60 * 60 * 24 * 365,
    user: {
      id: DEV_USER_ID,
      app_metadata: {},
      user_metadata: { devAuth: true },
      aud: "authenticated",
      created_at: new Date(0).toISOString(),
      email: DEV_USER_EMAIL,
    } as User,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passkeySupported, setPasskeySupported] = useState(false);

  const authToken = session?.access_token || null;
  const userId = session?.user?.id ?? (DEV_AUTH_MODE ? DEV_USER_ID : "");
  const profileEnabled = !!(authToken || DEV_AUTH_MODE);

  // ── Profile via TanStack Query ─────────────────────────────────────────────
  const profileQuery = useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => fetchProfile(authToken),
    enabled: profileEnabled,
    staleTime: 5 * 60_000,
  });

  const profile = profileQuery.data ?? null;
  // isPending is true when there's no data yet (first fetch or cache miss).
  // isLoading also requires isFetching, which can be false when the query is disabled —
  // using isPending ensures the splash stays up until we actually have profile data.
  const profileLoading = profileQuery.isPending;
  const profileError = profileQuery.error
    ? ((profileQuery.error as any)?.message as string | undefined) ??
      "We couldn't load your profile. Some personalized features may be unavailable."
    : null;

  // Sync device settings whenever profile data changes
  useEffect(() => {
    if (profile) syncSettingsFromProfile(profile);
  }, [profile]);

  // ── Auth setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (DEV_AUTH_MODE) {
      setSession(createDevSession());
      setPasskeySupported(false);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    const passkey = getPasskeyModule();
    setPasskeySupported(passkey?.isSupported?.() ?? false);

    return () => subscription.unsubscribe();
  }, []);

  // ── Auth methods ───────────────────────────────────────────────────────────
  async function sendOtp(email: string) {
    if (DEV_AUTH_MODE) return { error: "Email sign-in is disabled while EXPO_PUBLIC_AUTH_MODE=dev." };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function verifyOtp(email: string, token: string) {
    if (DEV_AUTH_MODE) return { error: "OTP verification is disabled while EXPO_PUBLIC_AUTH_MODE=dev." };
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) return { error: error.message };

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
    }
    return { error: null };
  }

  async function registerPasskey() {
    if (DEV_AUTH_MODE) return { error: "Passkeys are disabled while EXPO_PUBLIC_AUTH_MODE=dev." };
    const passkey = getPasskeyModule();
    if (!passkey?.isSupported?.()) return { error: "Passkeys are not available on this device." };
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "webauthn" });
      if (error) return { error: error.message };

      const webauthnData = (data as any).webauthn;
      const result: PasskeyCreateResult = await passkey.create(webauthnData);

      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: data.id,
        code: JSON.stringify(result),
      });
      if (verifyError) return { error: verifyError.message };
      return { error: null };
    } catch (e: any) {
      if (e?.error === "UserCancelled") return { error: null };
      return { error: e?.message ?? "Passkey registration failed" };
    }
  }

  async function signInWithPasskey() {
    if (DEV_AUTH_MODE) return { error: "Passkeys are disabled while EXPO_PUBLIC_AUTH_MODE=dev." };
    const passkey = getPasskeyModule();
    if (!passkey?.isSupported?.()) return { error: "Passkeys are not available on this device." };
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) return { error: error.message };

      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) return { error: factorsError.message };

      const webauthnFactor = (factorsData as any)?.all?.find((f: any) => f.factor_type === "webauthn");
      if (!webauthnFactor) return { error: "No passkey registered" };

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: webauthnFactor.id,
      });
      if (challengeError) return { error: challengeError.message };

      const result: PasskeyGetResult = await passkey.get((challengeData as any).webauthn);

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: webauthnFactor.id,
        challengeId: challengeData.id,
        code: JSON.stringify(result),
      });
      if (verifyError) return { error: verifyError.message };
      return { error: null };
    } catch (e: any) {
      if (e?.error === "UserCancelled") return { error: null };
      return { error: e?.message ?? "Passkey sign in failed" };
    }
  }

  async function updateProfileData(updates: ApiUpdateProfile) {
    if (!session && !DEV_AUTH_MODE) return { error: "Not authenticated" };

    // Optimistic update
    const previous = queryClient.getQueryData<ApiProfile>(queryKeys.profile(userId));
    if (previous) {
      queryClient.setQueryData(queryKeys.profile(userId), { ...previous, ...updates });
    }

    try {
      const updated = await updateProfile(authToken, updates);
      queryClient.setQueryData(queryKeys.profile(userId), updated);
      syncSettingsFromProfile(updated);
      return { error: null };
    } catch (e: any) {
      if (previous) queryClient.setQueryData(queryKeys.profile(userId), previous);
      return { error: e?.message ?? "Failed to update profile" };
    }
  }

  async function updateEmail(email: string) {
    if (DEV_AUTH_MODE) return { error: "Email changes are unavailable while EXPO_PUBLIC_AUTH_MODE=dev." };
    const { error } = await supabase.auth.updateUser({ email });
    if (error) return { error: error.message };
    return { error: null };
  }

  function getDeleteAccountErrorMessage(e: any): string {
    console.error("deleteAccount error", e);
    const raw = typeof e?.message === "string" ? e.message : typeof e === "string" ? e : "";
    const message = raw.toLowerCase();
    if (message.includes("401") || message.includes("unauthorized"))
      return "Your session has expired. Please sign in again.";
    if (message.includes("403") || message.includes("forbidden"))
      return "You do not have permission to delete this account.";
    if (message.includes("network") || message.includes("offline"))
      return "You appear to be offline. Check your internet connection and try again.";
    return "Something went wrong while deleting your account. Please try again.";
  }

  async function deleteAccount() {
    if (!session) return { error: "Not authenticated" };
    if (DEV_AUTH_MODE) return { error: "Account deletion is unavailable while EXPO_PUBLIC_AUTH_MODE=dev." };
    try {
      await apiDeleteAccount(authToken);
      await supabase.auth.signOut();
      await clearQueryCache();
      return { error: null };
    } catch (e: any) {
      return { error: getDeleteAccountErrorMessage(e) };
    }
  }

  async function signOut() {
    if (DEV_AUTH_MODE) {
      await clearQueryCache();
      return;
    }
    await supabase.auth.signOut();
    await clearQueryCache();
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      isDevAuth: DEV_AUTH_MODE,
      profile,
      profileLoading,
      profileError,
      updateProfileData,
      updateEmail,
      deleteAccount,
      sendOtp,
      verifyOtp,
      passkeySupported,
      registerPasskey,
      signInWithPasskey,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
