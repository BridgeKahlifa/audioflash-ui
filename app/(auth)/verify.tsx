import { useRef, useState } from "react";
import {
  View, Text, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";

export default function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp, sendOtp } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const inputRef = useRef<TextInput>(null);

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
    }
    // on success: auth state change → _layout redirects
  }

  async function handleResend() {
    if (!email) return;
    await sendOtp(email);
    setResent(true);
    setCode("");
    setError(null);
    setTimeout(() => setResent(false), 3000);
  }

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 max-w-md w-full mx-auto px-6 justify-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-secondary mb-8"
          >
            <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
