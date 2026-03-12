import { useEffect, useState } from "react";
import { ScrollView, View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";
import { ApiUpdateProfile } from "../../lib/api";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function SettingsScreen() {
  const { user, profile, profileLoading, updateProfileData, signOut } = useAuth();
  const [localSettings, setLocalSettings] = useState<ApiUpdateProfile>({
    cards_per_session: profile?.cards_per_session ?? 20,
    audio_speed: profile?.audio_speed ?? 1.0,
    notifications_enabled: profile?.notifications_enabled ?? false,
  });
  const [saved, setSaved] = useState(false);

  // Sync local state when profile loads or changes
  useEffect(() => {
    if (!profile) return;
    setLocalSettings({
      cards_per_session: profile.cards_per_session,
      audio_speed: profile.audio_speed,
      notifications_enabled: profile.notifications_enabled,
    });
  }, [profile]);

  if (profileLoading) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B4A" />
        </View>
      </SafeAreaView>
    );
  }

  async function save() {
    if (!localSettings) return;
    const { error } = await updateProfileData(localSettings);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    }
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
                onPress={() => setLocalSettings((prev) => prev ? { ...prev, cards_per_session: clamp((prev.cards_per_session ?? 20) - 5, 5, 50) } : prev)}
                className="w-10 h-10 rounded-full bg-secondary items-center justify-center"
              >
                <Ionicons name="remove" size={20} color="#1A1A1A" />
              </Pressable>
              <Text className="text-2xl font-semibold text-foreground">{localSettings.cards_per_session}</Text>
              <Pressable
                onPress={() => setLocalSettings((prev) => prev ? { ...prev, cards_per_session: clamp((prev.cards_per_session ?? 20) + 5, 5, 50) } : prev)}
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
                onPress={() => setLocalSettings((prev) => prev ? { ...prev, audio_speed: clamp(Number(((prev.audio_speed ?? 1.0) - 0.1).toFixed(1)), 0.5, 1.2) } : prev)}
                className="w-10 h-10 rounded-full bg-secondary items-center justify-center"
              >
                <Ionicons name="remove" size={20} color="#1A1A1A" />
              </Pressable>
              <Text className="text-2xl font-semibold text-foreground">{(localSettings.audio_speed ?? 1.0).toFixed(1)}x</Text>
              <Pressable
                onPress={() => setLocalSettings((prev) => prev ? { ...prev, audio_speed: clamp(Number(((prev.audio_speed ?? 1.0) + 0.1).toFixed(1)), 0.5, 1.2) } : prev)}
                className="w-10 h-10 rounded-full bg-secondary items-center justify-center"
              >
                <Ionicons name="add" size={20} color="#1A1A1A" />
              </Pressable>
            </View>
          </View>

          <View className="bg-card border border-border rounded-2xl p-5 mb-4">
            <Text className="text-foreground font-medium mb-3">Reminders</Text>
            <Pressable
              onPress={() => setLocalSettings((prev) => prev ? { ...prev, notifications_enabled: !prev.notifications_enabled } : prev)}
              className={`py-3 rounded-xl items-center ${localSettings.notifications_enabled ? "bg-primary" : "bg-secondary"}`}
            >
              <Text className={localSettings.notifications_enabled ? "text-primary-foreground font-semibold" : "text-foreground font-medium"}>
                {localSettings.notifications_enabled ? "Enabled" : "Disabled"}
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

          <View className="bg-card border border-border rounded-2xl p-5 mt-4">
            <Text className="text-muted text-sm mb-1">Signed in as</Text>
            <Text className="text-foreground font-medium">{user?.email}</Text>
          </View>

          <Pressable
            onPress={signOut}
            className="py-4 rounded-2xl items-center bg-secondary mt-3 flex-row justify-center gap-2"
          >
            <Ionicons name="log-out-outline" size={18} color="#6B7280" />
            <Text className="text-foreground font-medium">Sign Out</Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
