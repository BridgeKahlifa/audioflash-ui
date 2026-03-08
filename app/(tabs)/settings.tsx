import { useEffect, useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppSettings } from "../../lib/types";
import { getSettings, setSettings } from "../../lib/storage";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function SettingsScreen() {
  const [settings, setLocalSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setLocalSettings);
  }, []);

  if (!settings) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center max-w-md w-full mx-auto">
          <Text className="text-muted">Loading settings...</Text>
        </View>
        <View className="max-w-md w-full mx-auto">
        </View>
      </SafeAreaView>
    );
  }

  async function save() {
    if (!settings) return;
    await setSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
          <Text className="text-2xl font-semibold text-foreground">Settings</Text>
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="bg-card border border-border rounded-2xl p-5 mb-4">
            <Text className="text-foreground font-medium mb-3">Cards Per Session</Text>
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => setLocalSettings((prev) => prev ? { ...prev, cardsPerSession: clamp(prev.cardsPerSession - 5, 5, 50) } : prev)}
                className="w-10 h-10 rounded-full bg-secondary items-center justify-center"
              >
                <Ionicons name="remove" size={20} color="#1A1A1A" />
              </Pressable>
              <Text className="text-2xl font-semibold text-foreground">{settings.cardsPerSession}</Text>
              <Pressable
                onPress={() => setLocalSettings((prev) => prev ? { ...prev, cardsPerSession: clamp(prev.cardsPerSession + 5, 5, 50) } : prev)}
                className="w-10 h-10 rounded-full bg-secondary items-center justify-center"
              >
                <Ionicons name="add" size={20} color="#1A1A1A" />
              </Pressable>
            </View>
          </View>

          <View className="bg-card border border-border rounded-2xl p-5 mb-4">
            <Text className="text-foreground font-medium mb-3">Audio Speed</Text>
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => setLocalSettings((prev) => prev ? { ...prev, audioRate: clamp(Number((prev.audioRate - 0.1).toFixed(1)), 0.5, 1.2) } : prev)}
                className="w-10 h-10 rounded-full bg-secondary items-center justify-center"
              >
                <Ionicons name="remove" size={20} color="#1A1A1A" />
              </Pressable>
              <Text className="text-2xl font-semibold text-foreground">{settings.audioRate.toFixed(1)}x</Text>
              <Pressable
                onPress={() => setLocalSettings((prev) => prev ? { ...prev, audioRate: clamp(Number((prev.audioRate + 0.1).toFixed(1)), 0.5, 1.2) } : prev)}
                className="w-10 h-10 rounded-full bg-secondary items-center justify-center"
              >
                <Ionicons name="add" size={20} color="#1A1A1A" />
              </Pressable>
            </View>
          </View>

          <View className="bg-card border border-border rounded-2xl p-5 mb-4">
            <Text className="text-foreground font-medium mb-3">Reminders</Text>
            <Pressable
              onPress={() => setLocalSettings((prev) => prev ? { ...prev, remindersEnabled: !prev.remindersEnabled } : prev)}
              className={`py-3 rounded-xl items-center ${settings.remindersEnabled ? "bg-primary" : "bg-secondary"}`}
            >
              <Text className={settings.remindersEnabled ? "text-primary-foreground font-semibold" : "text-foreground font-medium"}>
                {settings.remindersEnabled ? "Enabled" : "Disabled"}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={save} className="py-4 rounded-2xl items-center bg-primary">
            <Text className="text-primary-foreground font-semibold">Save Settings</Text>
          </Pressable>
          {saved && <Text className="text-center text-muted mt-3">Saved</Text>}

          <Pressable
            onPress={() => router.push("/goals")}
            className="py-4 rounded-2xl items-center bg-secondary mt-3"
          >
            <Text className="text-foreground font-medium">Open Goals</Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
