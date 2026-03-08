import { useState } from "react";
import {
  View, Text, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";

export default function SignIn() {
  const { sendOtp, passkeySupported, signInWithPasskey } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  async function handleContinue() {
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await sendOtp(email.trim());
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    router.push({ pathname: "/(auth)/verify", params: { email: email.trim() } });
  }

  async function handlePasskey() {
    setError(null);
    setPasskeyLoading(true);
    const { error } = await signInWithPasskey();
    setPasskeyLoading(false);
    if (error) setError(error);
  }

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 max-w-md w-full mx-auto px-6">

          {/* Branding */}
          <View className="flex-1 justify-center">
            <View className="w-16 h-16 bg-accent rounded-2xl items-center justify-center mb-6">
              <Ionicons name="headset" size={36} color="#FF6B4A" />
            </View>
            <Text className="text-3xl font-semibold text-foreground tracking-tight mb-2">
              AudioFlash
            </Text>
            <Text className="text-muted mb-10">
              Enter your email to sign in or create a free account
            </Text>

            <TextInput
              className="bg-card border border-border rounded-2xl px-4 py-4 text-foreground mb-3"
              placeholder="Email address"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
              autoFocus
              value={email}
              onChangeText={(v) => { setEmail(v); setError(null); }}
              onSubmitEditing={handleContinue}
              returnKeyType="go"
            />

            {error && (
              <Text className="text-red-500 text-sm mb-3 text-center">{error}</Text>
            )}

            <Pressable
              onPress={handleContinue}
              disabled={loading}
              className="py-4 rounded-2xl items-center bg-primary mb-4"
              style={{
                shadowColor: "#FF6B4A",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text className="text-primary-foreground font-semibold text-base">Continue with Email</Text>
              }
            </Pressable>

            {passkeySupported && (
              <>
                <View className="flex-row items-center gap-3 mb-4">
                  <View className="flex-1 h-px bg-border" />
                  <Text className="text-muted text-sm">or</Text>
                  <View className="flex-1 h-px bg-border" />
                </View>

                <Pressable
                  onPress={handlePasskey}
                  disabled={passkeyLoading}
                  className="py-4 rounded-2xl items-center bg-card border border-border flex-row justify-center gap-2"
                >
                  {passkeyLoading
                    ? <ActivityIndicator color="#1A1A1A" />
                    : <>
                        <Ionicons name="finger-print" size={20} color="#1A1A1A" />
                        <Text className="text-foreground font-medium">Continue with Passkey</Text>
                      </>
                  }
                </Pressable>
              </>
            )}
          </View>

          <Text className="text-center text-xs text-muted pb-4">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
