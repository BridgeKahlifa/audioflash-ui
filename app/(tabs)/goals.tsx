import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppSettings, ProgressData } from "../../lib/types";
import { getProgress, getSettings, setSettings } from "../../lib/storage";

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
  const [settings, setLocalSettings] = useState<AppSettings | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    Promise.all([getSettings(), getProgress()]).then(([loadedSettings, loadedProgress]) => {
      setLocalSettings(loadedSettings);
      setProgress(loadedProgress);
    });
  }, []);

  const practicedToday = useMemo(() => todayCards(progress), [progress]);

  if (!settings) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center max-w-md w-full mx-auto">
          <Text className="text-muted">Loading goals...</Text>
        </View>
        <View className="max-w-md w-full mx-auto">
        </View>
      </SafeAreaView>
    );
  }

  const ratio = settings.dailyGoalCards > 0
    ? Math.min(practicedToday / settings.dailyGoalCards, 1)
    : 0;

  async function saveGoal(goal: number, remindersEnabled: boolean) {
    if (!settings) return;
    const next = { ...settings, dailyGoalCards: goal, remindersEnabled };
    setLocalSettings(next);
    await setSettings(next);
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
              {practicedToday} / {settings.dailyGoalCards} cards
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
                onPress={() => saveGoal(clamp(settings.dailyGoalCards - 5, 5, 200), settings.remindersEnabled)}
                className="w-10 h-10 rounded-full bg-secondary items-center justify-center"
              >
                <Ionicons name="remove" size={20} color="#1A1A1A" />
              </Pressable>
              <Text className="text-2xl font-semibold text-foreground">{settings.dailyGoalCards}</Text>
              <Pressable
                onPress={() => saveGoal(clamp(settings.dailyGoalCards + 5, 5, 200), settings.remindersEnabled)}
                className="w-10 h-10 rounded-full bg-secondary items-center justify-center"
              >
                <Ionicons name="add" size={20} color="#1A1A1A" />
              </Pressable>
            </View>
          </View>

          <View className="bg-card border border-border rounded-2xl p-5 mb-4">
            <Text className="text-foreground font-medium mb-3">Practice Reminder</Text>
            <Pressable
              onPress={() => saveGoal(settings.dailyGoalCards, !settings.remindersEnabled)}
              className={`py-3 rounded-xl items-center ${settings.remindersEnabled ? "bg-primary" : "bg-secondary"}`}
            >
              <Text className={settings.remindersEnabled ? "text-primary-foreground font-semibold" : "text-foreground font-medium"}>
                {settings.remindersEnabled ? "Reminder On" : "Reminder Off"}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push("/settings")}
            className="py-4 rounded-2xl items-center bg-secondary"
          >
            <Text className="text-foreground font-medium">Open Settings</Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
