import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { Passkey, PasskeyCreateResult, PasskeyGetResult } from "react-native-passkey";
import { supabase } from "./supabase";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  // OTP flow
  sendOtp: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  // Passkey flow
  passkeySupported: boolean;
  registerPasskey: () => Promise<{ error: string | null }>;
  signInWithPasskey: () => Promise<{ error: string | null }>;
  // Session
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passkeySupported, setPasskeySupported] = useState(false);

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
      const { data, error } = await supabase.auth.signInAnonymously();
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

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
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
