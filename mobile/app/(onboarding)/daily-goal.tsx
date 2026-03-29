import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { useAnalytics } from "../../lib/analytics";
import { StepDots } from "../../components/onboarding/StepDots";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function OnboardingDailyGoal() {
  const { updateProfileData } = useAuth();
  const posthog = useAnalytics();
  const [goal, setGoal] = useState(20);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFinish() {
    setSaving(true);
    const { error } = await updateProfileData({
      daily_goal: goal,
      onboarding_completed: true,
    });
    setSaving(false);
    if (error) {
      setError(error);
      return;
    }
    posthog?.capture("onboarding_completed", { daily_goal: goal });
    router.replace("/(tabs)");
  }

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} className="flex-1 bg-background">
      <View className="flex-1 px-6 max-w-md w-full mx-auto">
        <View className="pt-8 pb-10">
          <StepDots current={3} total={3} />
        </View>

        <View className="flex-1">
          <Text className="text-3xl font-semibold text-foreground tracking-tight mb-2">
            Set your daily goal
          </Text>
          <Text className="text-muted mb-10">
            How many flashcards do you want to practice each day?
          </Text>

          <View className="bg-card border border-border rounded-2xl p-6 items-center gap-6">
            <View className="flex-row items-center gap-8">
              <Pressable
                onPress={() => setGoal((g) => clamp(g - 5, 5, 200))}
                className="w-12 h-12 rounded-full bg-secondary items-center justify-center"
              >
                <Ionicons name="remove" size={22} color="#2F1E19" />
              </Pressable>

              <View className="items-center">
                <Text className="text-5xl font-semibold text-foreground">{goal}</Text>
                <Text className="text-muted text-sm mt-1">cards per day</Text>
              </View>

              <Pressable
                onPress={() => setGoal((g) => clamp(g + 5, 5, 200))}
                className="w-12 h-12 rounded-full bg-secondary items-center justify-center"
              >
                <Ionicons name="add" size={22} color="#2F1E19" />
              </Pressable>
            </View>

            <Text className="text-muted text-xs text-center">
              {goal <= 10 ? "A light daily habit — great for staying consistent." :
               goal <= 25 ? "A solid routine for steady progress." :
               "Ambitious! You'll make fast progress."}
            </Text>
          </View>
        </View>

        {error && (
          <Text className="text-red-500 text-sm mb-3">{error}</Text>
        )}

        <View className="pb-6">
          <Pressable
            onPress={handleFinish}
            disabled={saving}
            className="py-4 rounded-2xl items-center bg-primary"
            style={{
              shadowColor: "#E86A4A",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-primary-foreground font-semibold text-base">Let's go</Text>
            }
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
