import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";
import { fetchSRSQueue, type ApiSRSQueue } from "../../lib/api";

export default function Home() {
  const { session, profile } = useAuth();
  const [srsQueue, setSrsQueue] = useState<ApiSRSQueue | null>(null);
  const [loadingSRS, setLoadingSRS] = useState(true);

  useEffect(() => {
    async function loadSRS() {
      if (!session?.access_token) return;
      try {
        const queue = await fetchSRSQueue(session.access_token);
        setSrsQueue(queue);
      } catch {
        // non-critical
      } finally {
        setLoadingSRS(false);
      }
    }
    loadSRS();
  }, [session?.access_token]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = profile?.name?.split(" ")[0] ?? null;

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="max-w-md w-full mx-auto">
          {/* Header */}
          <View className="px-6 pt-8 pb-6">
            <Text className="text-3xl font-semibold text-foreground tracking-tight">
              {firstName ? `${greeting}, ${firstName}` : greeting}
            </Text>
            {profile?.streak_count != null && profile.streak_count > 0 ? (
              <View className="flex-row items-center mt-1.5 gap-1">
                <Text style={{ fontSize: 14 }}>🔥</Text>
                <Text className="text-muted text-sm">
                  {profile.streak_count} day streak
                </Text>
              </View>
            ) : (
              <Text className="text-muted mt-1 text-sm">Start practicing to build your streak</Text>
            )}
          </View>

          {/* SRS due card */}
          {!loadingSRS && srsQueue != null && srsQueue.due_count > 0 && (
            <Pressable
              onPress={() => router.push("/(tabs)/review")}
              className="mx-6 mb-4 rounded-2xl p-4 flex-row items-center bg-primary"
              style={{
                shadowColor: "#FF6B4A",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center mr-3">
                <Ionicons name="refresh-circle" size={22} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">
                  {srsQueue.due_count} card{srsQueue.due_count !== 1 ? "s" : ""} due for review
                </Text>
                <Text className="text-white/75 text-xs mt-0.5">Tap to start your review session</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          )}

          {/* Quick actions */}
          <View className="px-6 mb-2">
            <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
              Start Learning
            </Text>
          </View>

          <View className="px-6 gap-3">
            {/* Generate a Lesson */}
            <Pressable
              onPress={() => router.push("/generate")}
              className="rounded-2xl p-5 bg-card border border-border flex-row items-center"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="w-12 h-12 rounded-xl bg-accent items-center justify-center mr-4">
                <Ionicons name="sparkles" size={24} color="#FF6B4A" />
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-semibold text-base">Generate a Lesson</Text>
                <Text className="text-muted text-sm mt-0.5">
                  Type any topic — AI builds cards for you
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A0A0A0" />
            </Pressable>

            {/* Browse Categories */}
            <Pressable
              onPress={() => router.push("/browse-languages")}
              className="rounded-2xl p-5 bg-card border border-border flex-row items-center"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="w-12 h-12 rounded-xl bg-secondary items-center justify-center mr-4">
                <Ionicons name="library" size={24} color="#1A1A1A" />
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-semibold text-base">Browse Categories</Text>
                <Text className="text-muted text-sm mt-0.5">
                  Pick a language and topic to practice
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A0A0A0" />
            </Pressable>

            {/* My Library */}
            <Pressable
              onPress={() => router.push("/my-library")}
              className="rounded-2xl p-5 bg-card border border-border flex-row items-center"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="w-12 h-12 rounded-xl bg-secondary items-center justify-center mr-4">
                <Ionicons name="bookmark" size={24} color="#1A1A1A" />
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-semibold text-base">My Library</Text>
                <Text className="text-muted text-sm mt-0.5">
                  Saved lessons and AI-generated packs
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A0A0A0" />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
