import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Session, User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import * as ExpoLinking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";
import {
  ApiProfile,
  ApiUpdateProfile,
  DEV_AUTH_MODE,
  fetchProfile,
  updateProfile,
  registerAppleCredential,
  deleteAccount as apiDeleteAccount,
} from "./api";
import { captureHandledException, useAnalytics } from "./analytics";
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
  retryProfile: () => Promise<void>;
  updateProfileData: (updates: ApiUpdateProfile) => Promise<{ error: string | null }>;
  // OTP flow
  sendOtp: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  appleSignInSupported: boolean;
  signInWithApple: () => Promise<{ error: string | null }>;
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
const AUTH_BOOTSTRAP_TIMEOUT_MS = 4000;

WebBrowser.maybeCompleteAuthSession();

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

type AppleAuthenticationModule = typeof import("expo-apple-authentication");

function getAppleAuthModule(): AppleAuthenticationModule | null {
  if (Platform.OS !== "ios") return null;
  try {
    return require("expo-apple-authentication") as AppleAuthenticationModule;
  } catch (error) {
    console.warn("[auth] Apple authentication native module unavailable", error);
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

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function getEmailTypoSuggestion(value: string): string | null {
  const normalized = normalizeEmail(value);
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex === -1) return null;

  const domain = normalized.slice(atIndex + 1);
  const commonCorrections: Record<string, string> = {
    "gmail.con": "gmail.com",
    "gmail.co": "gmail.com",
    "gmail.cmo": "gmail.com",
    "hotmail.con": "hotmail.com",
    "hotmail.co": "hotmail.com",
    "hotmail.comf": "hotmail.com",
    "outlook.con": "outlook.com",
    "outlook.co": "outlook.com",
    "yahoo.con": "yahoo.com",
    "icloud.con": "icloud.com",
  };

  return commonCorrections[domain] ?? null;
}

function getEmailValidationError(value: string): string | null {
  const normalized = normalizeEmail(value);
  if (!looksLikeEmail(normalized)) {
    return "Enter a valid email address.";
  }

  const suggestedDomain = getEmailTypoSuggestion(normalized);
  if (suggestedDomain) {
    const [localPart = ""] = normalized.split("@");
    return `That email looks mistyped. Did you mean ${localPart}@${suggestedDomain}?`;
  }

  return null;
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
  if (message.includes("email address") && (message.includes("invalid") || message.includes("not authorized"))) {
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

function isAppleCancellation(error: unknown): boolean {
  const code = (error as any)?.code;
  if (code === "ERR_REQUEST_CANCELED" || code === "ERR_CANCELED") return true;
  const raw = typeof (error as any)?.message === "string" ? (error as any).message : "";
  return raw.toLowerCase().includes("canceled") || raw.toLowerCase().includes("cancelled");
}

function getAppleErrorMessage(error: unknown): string {
  const raw = typeof (error as any)?.message === "string"
    ? (error as any).message
    : typeof error === "string"
      ? error
      : "";
  const message = raw.toLowerCase();

  if (message.includes("network") || message.includes("failed to fetch") || message.includes("offline")) {
    return "We couldn't reach Apple sign-in. Check your connection and try again.";
  }

  return "We couldn't sign you in with Apple right now. Please try again.";
}

function formatAppleFullName(fullName: {
  givenName?: string | null;
  familyName?: string | null;
} | null | undefined): string | null {
  if (!fullName) return null;
  const name = [fullName.givenName, fullName.familyName]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .map((part) => part.trim())
    .join(" ");
  return name.length > 0 ? name : null;
}

function isOAuthCancellation(error: unknown): boolean {
  const raw = typeof (error as any)?.message === "string"
    ? (error as any).message
    : typeof error === "string"
      ? error
      : "";
  const message = raw.toLowerCase();

  return message.includes("access_denied") || message.includes("cancel");
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
  const [appleSignInSupported, setAppleSignInSupported] = useState(false);
  const posthog = useAnalytics();
  const lastProfileErrorRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (!profileQuery.error) {
      lastProfileErrorRef.current = null;
      return;
    }

    const errorMessage =
      typeof (profileQuery.error as any)?.message === "string"
        ? (profileQuery.error as any).message
        : "unknown_profile_error";
    const fingerprint = `${userId}:${errorMessage}`;
    if (lastProfileErrorRef.current === fingerprint) return;

    lastProfileErrorRef.current = fingerprint;
    captureHandledException(posthog, profileQuery.error, {
      error_context: "profile_query",
      query_name: "profile",
      is_dev_auth: DEV_AUTH_MODE,
      has_session: Boolean(authToken),
    });
  }, [authToken, posthog, profileQuery.error, userId]);

  async function ensureProfileRecord(user: User | null) {
    if (!user) return;
    await supabase.from("profiles").upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
  }

  // Only fills a blank name: a user who has since renamed themselves keeps their choice.
  async function persistAppleFullName(user: User | null, name: string | null) {
    if (!user || !name) return;
    const { error } = await supabase
      .from("profiles")
      .update({ name })
      .eq("id", user.id)
      .is("name", null);
    if (error) {
      captureHandledException(posthog, error, {
        error_context: "auth_persist_apple_full_name",
        auth_method: "apple",
      });
    }
  }

  // Apple requires tokens to be revoked when an account is deleted, which needs a
  // refresh token the native flow never hands us — only the API can exchange the
  // authorization code for one. Sign-in has already succeeded, so failures here are
  // logged and swallowed rather than shown to the user.
  async function registerAppleRevocationCredential(
    accessToken: string | null | undefined,
    authorizationCode: string | null | undefined,
  ) {
    if (!accessToken || !authorizationCode) return;
    try {
      await registerAppleCredential(accessToken, authorizationCode);
    } catch (error) {
      captureHandledException(posthog, error, {
        error_context: "auth_register_apple_credential",
        auth_method: "apple",
      });
    }
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
      if (!isOAuthCancellation(authError)) {
        captureHandledException(posthog, authError, {
          error_context: "auth_complete_oauth_redirect",
          auth_method: "google",
          oauth_stage: "callback",
        });
      }
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
      if (error) {
        captureHandledException(posthog, error, {
          error_context: "auth_complete_oauth_redirect",
          auth_method: "google",
          oauth_stage: "set_session",
        });
        return { handled: true, error: getOAuthErrorMessage(error) };
      }

      const { data: { user } } = await supabase.auth.getUser();
      await ensureProfileRecord(user);
      return { handled: true, error: null };
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      captureHandledException(posthog, error, {
        error_context: "auth_complete_oauth_redirect",
        auth_method: "google",
        oauth_stage: "exchange_code",
      });
      return { handled: true, error: getOAuthErrorMessage(error) };
    }

    const { data: { user } } = await supabase.auth.getUser();
    await ensureProfileRecord(user);
    return { handled: true, error: null };
  }

  // ── Auth setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (DEV_AUTH_MODE) {
      setSession(createDevSession());
      setPasskeySupported(false);
      setAppleSignInSupported(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const bootstrapTimeout = setTimeout(() => {
      if (cancelled) return;
      console.warn("[auth] getSession bootstrap timed out; continuing as signed out");
      captureHandledException(posthog, new Error("auth_bootstrap_timeout"), {
        error_context: "auth_bootstrap",
        auth_method: "session_restore",
      });
      setSession(null);
      setLoading(false);
    }, AUTH_BOOTSTRAP_TIMEOUT_MS);

    void supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        clearTimeout(bootstrapTimeout);
        setSession(session);
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        clearTimeout(bootstrapTimeout);
        captureHandledException(posthog, error, {
          error_context: "auth_bootstrap",
          auth_method: "session_restore",
        });
        setSession(null);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!cancelled) {
        clearTimeout(bootstrapTimeout);
        setLoading(false);
      }
      setSession(session);
      if (event === "SIGNED_IN" && session?.user) {
        void ensureProfileRecord(session.user);
      }
    });

    const passkey = getPasskeyModule();
    setPasskeySupported(passkey?.isSupported?.() ?? false);

    const appleAuth = getAppleAuthModule();
    if (appleAuth) {
      void appleAuth.isAvailableAsync()
        .then((available) => {
          if (!cancelled) setAppleSignInSupported(available);
        })
        .catch((error) => {
          console.warn("[auth] Apple sign-in availability check failed", error);
          if (!cancelled) setAppleSignInSupported(false);
        });
    } else {
      setAppleSignInSupported(false);
    }

    return () => {
      cancelled = true;
      clearTimeout(bootstrapTimeout);
      subscription.unsubscribe();
    };
  }, [posthog]);

  // ── Auth methods ───────────────────────────────────────────────────────────
  async function sendOtp(email: string) {
    if (DEV_AUTH_MODE) return { error: "Email sign-in is disabled while EXPO_PUBLIC_AUTH_MODE=dev." };
    const normalizedEmail = normalizeEmail(email);
    const validationError = getEmailValidationError(normalizedEmail);
    if (validationError) return { error: validationError };

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: true },
    });
    if (error) {
      captureHandledException(posthog, error, {
        error_context: "auth_send_otp",
        auth_method: "email_otp",
        email_domain: normalizedEmail.split("@")[1] ?? "",
      });
      console.warn("[auth] signInWithOtp failed", {
        message: typeof error.message === "string" ? error.message : String(error),
        status: (error as any)?.status,
        code: (error as any)?.code,
        emailDomain: normalizedEmail.split("@")[1] ?? "",
      });
      return { error: getEmailAuthErrorMessage(error, normalizedEmail) };
    }
    return { error: null };
  }

  async function verifyOtp(email: string, token: string) {
    if (DEV_AUTH_MODE) return { error: "OTP verification is disabled while EXPO_PUBLIC_AUTH_MODE=dev." };
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) {
      captureHandledException(posthog, error, {
        error_context: "auth_verify_otp",
        auth_method: "email_otp",
      });
      return { error: error.message };
    }

    const { data: { user } } = await supabase.auth.getUser();
    await ensureProfileRecord(user);
    return { error: null };
  }

  async function signInWithPassword(email: string, password: string) {
    if (DEV_AUTH_MODE) return { error: "Password sign-in is disabled while EXPO_PUBLIC_AUTH_MODE=dev." };
    const normalizedEmail = normalizeEmail(email);
    const validationError = getEmailValidationError(normalizedEmail);
    if (validationError) return { error: validationError };
    if (!password) return { error: "Enter the review account password." };

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) {
      captureHandledException(posthog, error, {
        error_context: "auth_sign_in_with_password",
        auth_method: "review_account",
      });
      return { error: "The review account email or password is incorrect." };
    }

    await ensureProfileRecord(data.user);
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

    if (error) {
      if (!isOAuthCancellation(error)) {
        captureHandledException(posthog, error, {
          error_context: "auth_sign_in_with_google",
          auth_method: "google",
          oauth_stage: "start",
        });
      }
      return { error: getOAuthErrorMessage(error) };
    }
    if (!data?.url) return { error: "We couldn't start Google sign-in right now. Please try again." };

    try {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== "success" || !result.url) {
        return { error: getOAuthErrorMessage(result.type) };
      }

      const completion = await completeOAuthRedirect(result.url);
      if (!completion.handled) {
        return { error: "Google sign-in returned an unexpected redirect." };
      }

      return { error: completion.error };
    } catch (authError) {
      return { error: getOAuthErrorMessage(authError) };
    }
  }

  async function signInWithApple() {
    if (DEV_AUTH_MODE) return { error: "Apple sign-in is disabled while EXPO_PUBLIC_AUTH_MODE=dev." };

    const appleAuth = getAppleAuthModule();
    if (!appleAuth) return { error: "Apple sign-in is not available on this device." };

    try {
      const credential = await appleAuth.signInAsync({
        requestedScopes: [
          appleAuth.AppleAuthenticationScope.FULL_NAME,
          appleAuth.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        captureHandledException(posthog, new Error("apple_missing_identity_token"), {
          error_context: "auth_sign_in_with_apple",
          auth_method: "apple",
          oauth_stage: "native_sign_in",
        });
        return { error: "Apple sign-in did not return a valid token. Please try again." };
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (error) {
        captureHandledException(posthog, error, {
          error_context: "auth_sign_in_with_apple",
          auth_method: "apple",
          oauth_stage: "sign_in_with_id_token",
        });
        return { error: getAppleErrorMessage(error) };
      }

      await ensureProfileRecord(data.user);
      // Apple returns the user's name only on the first authorization, so persist it now.
      await persistAppleFullName(data.user, formatAppleFullName(credential.fullName));
      await registerAppleRevocationCredential(
        data.session?.access_token,
        credential.authorizationCode,
      );

      return { error: null };
    } catch (appleError) {
      if (isAppleCancellation(appleError)) return { error: null };
      captureHandledException(posthog, appleError, {
        error_context: "auth_sign_in_with_apple",
        auth_method: "apple",
        oauth_stage: "native_sign_in",
      });
      return { error: getAppleErrorMessage(appleError) };
    }
  }

  async function registerPasskey() {
    if (DEV_AUTH_MODE) return { error: "Passkeys are disabled while EXPO_PUBLIC_AUTH_MODE=dev." };
    const passkey = getPasskeyModule();
    if (!passkey?.isSupported?.()) return { error: "Passkeys are not available on this device." };
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "webauthn" });
      if (error) {
        captureHandledException(posthog, error, {
          error_context: "auth_register_passkey",
          auth_method: "passkey",
          passkey_stage: "enroll",
        });
        return { error: error.message };
      }

      const webauthnData = (data as any).webauthn;
      const result: PasskeyCreateResult = await passkey.create(webauthnData);

      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: data.id,
        code: JSON.stringify(result),
      });
      if (verifyError) {
        captureHandledException(posthog, verifyError, {
          error_context: "auth_register_passkey",
          auth_method: "passkey",
          passkey_stage: "challenge_verify",
        });
        return { error: verifyError.message };
      }
      return { error: null };
    } catch (e: any) {
      if (e?.error === "UserCancelled") return { error: null };
      captureHandledException(posthog, e, {
        error_context: "auth_register_passkey",
        auth_method: "passkey",
        passkey_stage: "native_create",
      });
      return { error: e?.message ?? "Passkey registration failed" };
    }
  }

  async function signInWithPasskey() {
    if (DEV_AUTH_MODE) return { error: "Passkeys are disabled while EXPO_PUBLIC_AUTH_MODE=dev." };
    const passkey = getPasskeyModule();
    if (!passkey?.isSupported?.()) return { error: "Passkeys are not available on this device." };
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        captureHandledException(posthog, error, {
          error_context: "auth_sign_in_with_passkey",
          auth_method: "passkey",
          passkey_stage: "sign_in_anonymously",
        });
        return { error: error.message };
      }

      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) {
        captureHandledException(posthog, factorsError, {
          error_context: "auth_sign_in_with_passkey",
          auth_method: "passkey",
          passkey_stage: "list_factors",
        });
        return { error: factorsError.message };
      }

      const webauthnFactor = (factorsData as any)?.all?.find((f: any) => f.factor_type === "webauthn");
      if (!webauthnFactor) return { error: "No passkey registered" };

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: webauthnFactor.id,
      });
      if (challengeError) {
        captureHandledException(posthog, challengeError, {
          error_context: "auth_sign_in_with_passkey",
          auth_method: "passkey",
          passkey_stage: "challenge",
        });
        return { error: challengeError.message };
      }

      const result: PasskeyGetResult = await passkey.get((challengeData as any).webauthn);

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: webauthnFactor.id,
        challengeId: challengeData.id,
        code: JSON.stringify(result),
      });
      if (verifyError) {
        captureHandledException(posthog, verifyError, {
          error_context: "auth_sign_in_with_passkey",
          auth_method: "passkey",
          passkey_stage: "verify",
        });
        return { error: verifyError.message };
      }
      return { error: null };
    } catch (e: any) {
      if (e?.error === "UserCancelled") return { error: null };
      captureHandledException(posthog, e, {
        error_context: "auth_sign_in_with_passkey",
        auth_method: "passkey",
        passkey_stage: "native_get",
      });
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
      captureHandledException(posthog, e, {
        error_context: "update_profile",
        updated_fields: Object.keys(updates).sort().join(","),
      });
      if (previous) queryClient.setQueryData(queryKeys.profile(userId), previous);
      return { error: e?.message ?? "Failed to update profile" };
    }
  }

  async function updateEmail(email: string) {
    if (DEV_AUTH_MODE) return { error: "Email changes are unavailable while EXPO_PUBLIC_AUTH_MODE=dev." };
    const normalizedEmail = normalizeEmail(email);
    const validationError = getEmailValidationError(normalizedEmail);
    if (validationError) return { error: validationError };

    const { error } = await supabase.auth.updateUser({ email: normalizedEmail });
    if (error) {
      captureHandledException(posthog, error, {
        error_context: "update_email",
        auth_method: "email",
        email_domain: normalizedEmail.split("@")[1] ?? "",
      });
      return { error: getEmailAuthErrorMessage(error, normalizedEmail) };
    }
    return { error: null };
  }

  function getDeleteAccountErrorMessage(e: any): string {
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
      // The server has already permanently deleted the account. Clear the local
      // session best-effort so a transient Supabase error cannot make the UI
      // incorrectly report that deletion failed.
      await supabase.auth.signOut().catch(() => undefined);
      await clearQueryCache();
      return { error: null };
    } catch (e: any) {
      captureHandledException(posthog, e, {
        error_context: "delete_account",
        auth_method: "authenticated",
      });
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

  async function retryProfile() {
    if (!profileEnabled) return;
    await profileQuery.refetch();
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
      retryProfile,
      updateProfileData,
      updateEmail,
      deleteAccount,
      sendOtp,
      verifyOtp,
      signInWithPassword,
      signInWithGoogle,
      appleSignInSupported,
      signInWithApple,
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
