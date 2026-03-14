import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { Passkey, PasskeyCreateResult, PasskeyGetResult } from "react-native-passkey";
import { supabase } from "./supabase";
import { ApiProfile, ApiUpdateProfile, fetchProfile, updateProfile, deleteAccount as apiDeleteAccount } from "./api";
import { getCachedProfile, setCachedProfile, clearCachedProfile } from "./storage";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  // Profile
  profile: ApiProfile | null;
  profileLoading: boolean;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Stale-while-revalidate: show cached profile instantly, then refresh from API in background
  useEffect(() => {
    if (!session?.access_token) {
      setProfile(null);
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      const cached = await getCachedProfile();
      if (cached) {
        if (!cancelled) setProfile(cached);
      } else {
        if (!cancelled) setProfileLoading(true);
      }

      try {
        const fresh = await fetchProfile(session!.access_token);
        if (!cancelled) {
          setProfile(fresh);
          setCachedProfile(fresh);
        }
      } catch {
        // Keep showing cached data if API fails
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    loadProfile();
    return () => { cancelled = true; };
  }, [session?.user?.id]); // re-fetch only if the logged-in user changes, not on token refresh

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    setPasskeySupported(Passkey.isSupported());

    return () => subscription.unsubscribe();
  }, []);

  async function sendOtp(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function verifyOtp(email: string, token: string) {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) return { error: error.message };

    // Create profile if it doesn't exist yet
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
    }

    return { error: null };
  }

  async function registerPasskey() {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "webauthn" });
      if (error) return { error: error.message };

      const webauthnData = (data as any).webauthn;
      const result: PasskeyCreateResult = await Passkey.create(webauthnData);

      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: data.id,
        code: JSON.stringify(result),
      });
      if (verifyError) return { error: verifyError.message };

      return { error: null };
    } catch (e: any) {
      if (e?.error === "UserCancelled") return { error: null }; // user dismissed — not an error
      return { error: e?.message ?? "Passkey registration failed" };
    }
  }

  async function signInWithPasskey() {
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) return { error: error.message };

      // Get MFA factors and find webauthn
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) return { error: factorsError.message };

      const webauthnFactor = (factorsData as any)?.all?.find((f: any) => f.factor_type === "webauthn");
      if (!webauthnFactor) return { error: "No passkey registered" };

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: webauthnFactor.id,
      });
      if (challengeError) return { error: challengeError.message };

      const result: PasskeyGetResult = await Passkey.get(
        (challengeData as any).webauthn
      );

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
    if (!session?.access_token) return { error: "Not authenticated" };

    // Optimistic update
    const previous = profile;
    if (previous) {
      const optimistic = { ...previous, ...updates } as ApiProfile;
      setProfile(optimistic);
    }

    try {
      const updated = await updateProfile(session.access_token, updates);
      setProfile(updated);
      setCachedProfile(updated);
      return { error: null };
    } catch (e: any) {
      // Revert on failure
      setProfile(previous);
      return { error: e?.message ?? "Failed to update profile" };
    }
  }

  async function updateEmail(email: string) {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) return { error: error.message };
    return { error: null };
  }

  function getDeleteAccountErrorMessage(e: any): string {
    // Log raw error for debugging/monitoring
    console.error("deleteAccount error", e);

    const raw = typeof e?.message === "string"
      ? e.message
      : typeof e === "string"
        ? e
        : "";

    const message = raw.toLowerCase();

    // Session/authentication issues
    if (message.includes("401") || message.includes("unauthorized")) {
      return "Your session has expired. Please sign in again.";
    }

    if (message.includes("403") || message.includes("forbidden")) {
      return "You do not have permission to delete this account.";
    }

    // Network/offline issues
    if (
      message.includes("network") ||
      message.includes("offline") ||
      (typeof navigator !== "undefined" && navigator && (navigator as any).onLine === false)
    ) {
      return "You appear to be offline. Check your internet connection and try again.";
    }

    // Generic fallback
    return "Something went wrong while deleting your account. Please try again.";
  }

  async function deleteAccount() {
    if (!session?.access_token) return { error: "Not authenticated" };
    try {
      await apiDeleteAccount(session.access_token);
      await Promise.all([supabase.auth.signOut(), clearCachedProfile()]);
      return { error: null };
    } catch (e: any) {
      return { error: getDeleteAccountErrorMessage(e) };
    }
  }

  async function signOut() {
    await Promise.all([supabase.auth.signOut(), clearCachedProfile()]);
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      profile,
      profileLoading,
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
