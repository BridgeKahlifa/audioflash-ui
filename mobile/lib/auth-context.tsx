import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import * as ExpoLinking from "expo-linking";
import { Linking as RNLinking } from "react-native";
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
  signInWithGoogle: () => Promise<{ error: string | null }>;
  completeOAuthRedirect: (url: string) => Promise<{ handled: boolean; error: string | null }>;
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
const AUTH_CALLBACK_PATH = "auth/callback";

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

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getEmailAuthErrorMessage(error: unknown, email?: string): string {
  const raw = typeof (error as any)?.message === "string"
    ? (error as any).message
    : typeof error === "string"
      ? error
      : "";
  const message = raw.toLowerCase();

  if (email && !looksLikeEmail(email.trim())) {
    return "Enter a valid email address.";
  }
  if (message.includes("database error saving new user")) {
    return "We couldn't create an account with that email. Check the address and try again.";
  }
  if (message.includes("email rate limit exceeded") || message.includes("over_email_send_rate_limit")) {
    return "Too many email attempts. Wait a minute and try again.";
  }
  if (message.includes("invalid email")) {
    return "Enter a valid email address.";
  }
  if (message.includes("signup is disabled")) {
    return "Email sign-up is currently unavailable. Try again later.";
  }
  if (message.includes("network") || message.includes("failed to fetch") || message.includes("offline")) {
    return "We couldn't reach the server. Check your connection and try again.";
  }

  return "We couldn't send a sign-in code right now. Please try again.";
}

function getOAuthErrorMessage(error: unknown): string {
  const raw = typeof (error as any)?.message === "string"
    ? (error as any).message
    : typeof error === "string"
      ? error
      : "";
  const message = raw.toLowerCase();

  if (message.includes("network") || message.includes("failed to fetch") || message.includes("offline")) {
    return "We couldn't reach Google sign-in. Check your connection and try again.";
  }
  if (message.includes("access_denied") || message.includes("cancel")) {
    return "Google sign-in was canceled.";
  }

  return "We couldn't sign you in with Google right now. Please try again.";
}

function getOAuthCallbackPath(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.host.replace(/^\/+|\/+$/g, "");
    const pathname = parsedUrl.pathname.replace(/^\/+|\/+$/g, "");
    return [host, pathname].filter(Boolean).join("/");
  } catch {
    const parsed = ExpoLinking.parse(url);
    return (parsed.path ?? "").replace(/^\/+|\/+$/g, "");
  }
}

function getOAuthCallbackParams(url: string): Record<string, string> {
  try {
    const parsedUrl = new URL(url);
    const params = Object.fromEntries(parsedUrl.searchParams.entries());
    const hash = parsedUrl.hash.startsWith("#") ? parsedUrl.hash.slice(1) : parsedUrl.hash;
    const hashParams = new URLSearchParams(hash);
    for (const [key, value] of hashParams.entries()) {
      params[key] = value;
    }
    return params;
  } catch {
    const parsed = ExpoLinking.parse(url);
    return Object.entries(parsed.queryParams ?? {}).reduce<Record<string, string>>((acc, [key, value]) => {
      if (typeof value === "string") {
        acc[key] = value;
      }
      return acc;
    }, {});
  }
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

  async function ensureProfileRecord(user: User | null) {
    if (!user) return;
    await supabase.from("profiles").upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
  }

  async function completeOAuthRedirect(url: string): Promise<{ handled: boolean; error: string | null }> {
    const path = getOAuthCallbackPath(url);
    const params = getOAuthCallbackParams(url);
    const code = params.code ?? null;
    const accessToken = params.access_token ?? null;
    const refreshToken = params.refresh_token ?? null;
    const authError = params.error_description ?? params.error ?? null;

    if (path !== AUTH_CALLBACK_PATH && !code && !accessToken && !refreshToken && !authError) {
      return { handled: false, error: null };
    }

    if (authError) {
      return { handled: true, error: getOAuthErrorMessage(authError) };
    }

    if (!code) {
      if (!accessToken || !refreshToken) {
        return { handled: true, error: "Google sign-in did not return a valid session." };
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) return { handled: true, error: getOAuthErrorMessage(error) };

      const { data: { user } } = await supabase.auth.getUser();
      await ensureProfileRecord(user);
      return { handled: true, error: null };
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { handled: true, error: getOAuthErrorMessage(error) };

    const { data: { user } } = await supabase.auth.getUser();
    await ensureProfileRecord(user);
    return { handled: true, error: null };
  }

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "SIGNED_IN" && session?.user) {
        void ensureProfileRecord(session.user);
      }
    });

    const passkey = getPasskeyModule();
    setPasskeySupported(passkey?.isSupported?.() ?? false);

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ── Auth methods ───────────────────────────────────────────────────────────
  async function sendOtp(email: string) {
    if (DEV_AUTH_MODE) return { error: "Email sign-in is disabled while EXPO_PUBLIC_AUTH_MODE=dev." };
    if (!looksLikeEmail(email.trim())) {
      return { error: "Enter a valid email address." };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) return { error: getEmailAuthErrorMessage(error, email) };
    return { error: null };
  }

  async function verifyOtp(email: string, token: string) {
    if (DEV_AUTH_MODE) return { error: "OTP verification is disabled while EXPO_PUBLIC_AUTH_MODE=dev." };
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) return { error: error.message };

    const { data: { user } } = await supabase.auth.getUser();
    await ensureProfileRecord(user);
    return { error: null };
  }

  async function signInWithGoogle() {
    if (DEV_AUTH_MODE) return { error: "Google sign-in is disabled while EXPO_PUBLIC_AUTH_MODE=dev." };

    const redirectTo = ExpoLinking.createURL(AUTH_CALLBACK_PATH);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (error) return { error: getOAuthErrorMessage(error) };
    if (!data?.url) return { error: "We couldn't start Google sign-in right now. Please try again." };

    try {
      await RNLinking.openURL(data.url);
      return { error: null };
    } catch (openError) {
      return { error: getOAuthErrorMessage(openError) };
    }
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
    if (!looksLikeEmail(email.trim())) return { error: "Enter a valid email address." };
    const { error } = await supabase.auth.updateUser({ email });
    if (error) return { error: getEmailAuthErrorMessage(error, email) };
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
      signInWithGoogle,
      completeOAuthRedirect,
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
