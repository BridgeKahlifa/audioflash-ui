import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ProgressData } from "../../lib/types";
import { getProgress } from "../../lib/storage";
import { useAuth } from "../../lib/auth-context";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function todayCards(progress: ProgressData | null): number {
  if (!progress) return 0;
  const today = new Date().toISOString().slice(0, 10);
  return progress.sessions
    .filter((session) => session.date === today)
    .reduce((sum, session) => sum + session.total, 0);
}

export default function GoalsScreen() {
  const { profile, profileLoading, updateProfileData } = useAuth();
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    getProgress().then(setProgress);
  }, []);

  const practicedToday = useMemo(() => todayCards(progress), [progress]);

  if (profileLoading) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B4A" />
        </View>
      </SafeAreaView>
    );
  }

  const dailyGoal = profile?.daily_goal ?? 20;
  const notificationsEnabled = profile?.notifications_enabled ?? false;
  const ratio = dailyGoal > 0 ? Math.min(practicedToday / dailyGoal, 1) : 0;

  async function saveGoal(goal: number, notificationsEnabled: boolean) {
    await updateProfileData({ daily_goal: goal, notifications_enabled: notificationsEnabled });
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
          <Text className="text-2xl font-semibold text-foreground">Goals</Text>
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="bg-card border border-border rounded-2xl p-5 mb-4">
            <Text className="text-muted">Today</Text>
            <Text className="text-3xl font-semibold text-foreground mt-1">
              {practicedToday} / {dailyGoal} cards
            </Text>
            <View className="h-2 bg-secondary rounded-full mt-3 overflow-hidden">
              <View className="h-full bg-primary rounded-full" style={{ width: `${ratio * 100}%` }} />
            </View>
            <Text className="text-muted text-xs mt-2">
              {ratio >= 1 ? "Goal reached for today." : "Keep going to hit your goal."}
            </Text>
          </View>

          <View className="bg-card border border-border rounded-2xl p-5 mb-4">
            <Text className="text-foreground font-medium mb-3">Daily Goal (Cards)</Text>
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => saveGoal(clamp(dailyGoal - 5, 5, 200), notificationsEnabled)}
                className="w-10 h-10 rounded-full bg-secondary items-center justify-center"
              >
                <Ionicons name="remove" size={20} color="#1A1A1A" />
              </Pressable>
              <Text className="text-2xl font-semibold text-foreground">{dailyGoal}</Text>
              <Pressable
                onPress={() => saveGoal(clamp(dailyGoal + 5, 5, 200), notificationsEnabled)}
                className="w-10 h-10 rounded-full bg-secondary items-center justify-center"
              >
                <Ionicons name="add" size={20} color="#1A1A1A" />
              </Pressable>
            </View>
          </View>

          <View className="bg-card border border-border rounded-2xl p-5 mb-4">
            <Text className="text-foreground font-medium mb-3">Practice Reminder</Text>
            <Pressable
              onPress={() => saveGoal(dailyGoal, !notificationsEnabled)}
              className={`py-3 rounded-xl items-center ${notificationsEnabled ? "bg-primary" : "bg-secondary"}`}
            >
              <Text className={notificationsEnabled ? "text-primary-foreground font-semibold" : "text-foreground font-medium"}>
                {notificationsEnabled ? "Reminder On" : "Reminder Off"}
              </Text>
            </Pressable>
          </View>


        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
