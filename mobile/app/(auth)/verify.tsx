import { useRef, useState } from "react";
import {
  View, Text, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";
import { useAnalytics } from "../../lib/analytics";
import { useAppTheme } from "../../lib/theme-context";

export default function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp, sendOtp } = useAuth();
  const posthog = useAnalytics();
  const { matrixMode } = useAppTheme();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const backButtonPalette = matrixMode
    ? {
        background: "#202020",
        icon: "#ff8c42",
      }
    : {
        background: "#FBE7DE",
        icon: "#1A1A1A",
      };

  async function handleVerify() {
    if (code.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await verifyOtp(email ?? "", code.trim());
    setLoading(false);
    if (error) {
      setError("Invalid or expired code. Try again.");
      setCode("");
      posthog?.capture("auth_otp_verify_failed");
    } else {
      posthog?.capture("auth_otp_verified");
    }
    // on success: auth state change → _layout redirects
  }

  async function handleResend() {
    if (!email) return;
    await sendOtp(email);
    posthog?.capture("auth_otp_resent");
    setResent(true);
    setCode("");
    setError(null);
    setTimeout(() => setResent(false), 3000);
  }

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View className="flex-1 max-w-md w-full mx-auto px-6 pt-10 pb-8 justify-start">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full mb-8"
            style={{ backgroundColor: backButtonPalette.background }}
          >
            <Ionicons name="chevron-back" size={22} color={backButtonPalette.icon} />
          </Pressable>

          <Text className="text-3xl font-semibold text-foreground tracking-tight mb-2">
            Check your email
          </Text>
          <Text className="text-muted mb-8">
            We sent a 6-digit code to{"\n"}
            <Text className="text-foreground font-medium">{email}</Text>
            {"\n\n"}No password needed — just enter the code to sign in.
          </Text>

          <TextInput
            ref={inputRef}
            className="bg-card border border-border rounded-2xl px-4 py-4 text-foreground text-center text-2xl font-semibold tracking-widest mb-3"
            placeholder="000000"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            value={code}
            onChangeText={(v) => {
              setCode(v);
              setError(null);
            }}
          />

          {error && (
            <Text className="text-red-500 text-sm mb-4 text-center">{error}</Text>
          )}

          <Pressable
            onPress={handleVerify}
            disabled={loading || code.length !== 6}
            className={`py-4 rounded-2xl items-center mb-4 ${code.length === 6 ? "bg-primary" : "bg-secondary"}`}
            style={code.length === 6 ? {
              shadowColor: "#FF6B4A",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            } : undefined}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className={`font-semibold text-base ${code.length === 6 ? "text-primary-foreground" : "text-muted"}`}>
                  Verify Code
                </Text>
            }
          </Pressable>

          <Pressable onPress={handleResend} className="items-center py-2">
            <Text className="text-muted text-sm">
              {resent ? "Code resent!" : "Didn't get it? "}
              {!resent && <Text className="text-primary font-medium">Resend code</Text>}
            </Text>
          </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
