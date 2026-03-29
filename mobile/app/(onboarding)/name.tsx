import { useState } from "react";
import {
  View, Text, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { useAnalytics } from "../../lib/analytics";
import { StepDots } from "../../components/onboarding/StepDots";

export default function OnboardingName() {
  const { updateProfileData } = useAuth();
  const posthog = useAnalytics();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setLoading(true);
    const { error } = await updateProfileData({ name: name.trim() });
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    posthog?.capture("onboarding_name_set");
    router.push("/(onboarding)/target-languages");
  }

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-6 max-w-md w-full mx-auto">
          <View className="pt-8 pb-10">
            <StepDots current={1} total={3} />
          </View>

          <View className="flex-1">
            <Text className="text-3xl font-semibold text-foreground tracking-tight mb-2">
              What's your name?
            </Text>
            <Text className="text-muted mb-8">
              We'll use this to personalize your experience.
            </Text>

            <TextInput
              className="bg-card border border-border rounded-2xl px-4 py-4 text-foreground text-base"
              placeholder="Your name"
              placeholderTextColor="#8B6E66"
              autoFocus
              autoCapitalize="words"
              value={name}
              onChangeText={(v) => { setName(v); setError(null); }}
              onSubmitEditing={handleContinue}
              returnKeyType="go"
            />

            {error && (
              <Text className="text-red-500 text-sm mt-2">{error}</Text>
            )}
          </View>

          <View className="pb-6">
            <Pressable
              onPress={handleContinue}
              disabled={loading}
              className="py-4 rounded-2xl items-center bg-primary"
              style={{
                shadowColor: "#E86A4A",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text className="text-primary-foreground font-semibold text-base">Continue</Text>
              }
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
