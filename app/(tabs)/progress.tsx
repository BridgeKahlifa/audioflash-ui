import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { getProgress, getSessionHistory } from "../../lib/storage";
import { ProgressData, SessionHistoryItem } from "../../lib/types";

function last7Days(): { day: string; date: string }[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      day: days[d.getDay()],
      date: d.toISOString().slice(0, 10),
    };
  });
}

function SimpleBarChart({ data }: { data: { day: string; cards: number }[] }) {
  const max = Math.max(...data.map((d) => d.cards), 1);
  return (
    <View className="flex-row items-end justify-between" style={{ height: 140 }}>
      {data.map((item, i) => (
        <View key={i} className="flex-1 items-center" style={{ gap: 4 }}>
          <Text style={{ fontSize: 10, color: item.cards > 0 ? "#FF6B4A" : "transparent", fontWeight: "600" }}>
            {item.cards}
          </Text>
          <View
            style={{
              width: 28,
              height: Math.max(item.cards > 0 ? (item.cards / max) * 90 : 4, 4),
              backgroundColor: item.cards > 0 ? "#FF6B4A" : "#F5F5F5",
              borderRadius: 6,
            }}
          />
          <Text className="text-xs text-muted">{item.day}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ProgressDashboard() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);

  useEffect(() => {
    getProgress().then(setProgress);
    getSessionHistory().then((items) => setHistory(items.slice(0, 8)));
  }, []);

  const days = last7Days();
  const weeklyData = days.map(({ day, date }) => ({
    day,
    cards: progress?.sessions
      .filter((s) => s.date === date)
      .reduce((sum, s) => sum + s.total, 0) ?? 0,
  }));

  const accuracy =
    progress && progress.totalCards > 0
      ? Math.round((progress.totalCorrect / progress.totalCards) * 100)
      : 0;

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
          <Text className="text-2xl font-semibold text-foreground">
            Your Progress
          </Text>
        </View>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <View className="flex-row gap-3 mb-4">
            <Pressable
              onPress={() => router.push("/goals")}
              className="flex-1 bg-card border border-border rounded-xl px-4 py-3"
            >
              <Text className="text-foreground font-medium text-center">Goals</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/session-summary")}
              className="flex-1 bg-card border border-border rounded-xl px-4 py-3"
            >
              <Text className="text-foreground font-medium text-center">Last Summary</Text>
            </Pressable>
          </View>

          {/* Streak banner */}
          <View
            className="rounded-3xl p-6 mb-4"
            style={{ backgroundColor: "#FF6B4A" }}
          >
            <View className="flex-row items-center gap-3 mb-2">
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              >
                <Ionicons name="flame" size={28} color="#FFFFFF" />
              </View>
              <View>
                <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
                  Daily Streak
                </Text>
                <Text
                  className="text-3xl font-bold"
                  style={{ color: "#FFFFFF" }}
                >
                  {progress?.streak ?? 0} days
                </Text>
              </View>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 8 }}>
              {(progress?.streak ?? 0) > 0
                ? "Keep your streak alive!"
                : "Start practicing to build your streak!"}
            </Text>
          </View>

          {/* Stats */}
          <View className="flex-row gap-3 mb-4">
            <View
              className="flex-1 bg-card rounded-2xl p-4 border border-border"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <View className="w-10 h-10 bg-accent rounded-xl items-center justify-center mb-3">
                <Ionicons name="radio-button-on" size={20} color="#FF6B4A" />
              </View>
              <Text className="text-2xl font-semibold text-foreground mb-1">
                {progress?.totalCards ?? 0}
              </Text>
              <Text className="text-xs text-muted">Cards Practiced</Text>
            </View>

            <View
              className="flex-1 bg-card rounded-2xl p-4 border border-border"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <View className="w-10 h-10 bg-accent rounded-xl items-center justify-center mb-3">
                <Ionicons name="trending-up" size={20} color="#FF6B4A" />
              </View>
              <Text className="text-2xl font-semibold text-foreground mb-1">
                {accuracy}%
              </Text>
              <Text className="text-xs text-muted">Accuracy</Text>
            </View>

            <View
              className="flex-1 bg-card rounded-2xl p-4 border border-border"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <View className="w-10 h-10 bg-accent rounded-xl items-center justify-center mb-3">
                <Ionicons name="trophy" size={20} color="#FF6B4A" />
              </View>
              <Text className="text-2xl font-semibold text-foreground mb-1">
                {progress?.sessions.length ?? 0}
              </Text>
              <Text className="text-xs text-muted">Sessions</Text>
            </View>
          </View>

          {/* Weekly chart */}
          <View
            className="bg-card rounded-2xl p-5 border border-border mb-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <Text className="text-base font-medium text-foreground mb-4">
              This Week
            </Text>
            <SimpleBarChart data={weeklyData} />
            <Text className="text-center text-xs text-muted mt-3">
              Cards practiced per day
            </Text>
          </View>

          {/* CTA */}
          <View className="bg-accent border border-primary rounded-2xl p-5 items-center"
            style={{ borderColor: "rgba(255,107,74,0.2)" }}
          >
            <Text className="text-sm text-muted text-center mb-3">
              {(progress?.streak ?? 0) > 0
                ? "You're doing great! Keep practicing daily."
                : "Ready to start your first lesson?"}
            </Text>
            <Pressable
              onPress={() => router.replace("/")}
              className="w-full py-3 bg-primary rounded-xl items-center"
              style={{
                shadowColor: "#FF6B4A",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text className="text-base font-semibold text-primary-foreground">
                Start New Lesson
              </Text>
            </Pressable>
          </View>

          <View
            className="bg-card rounded-2xl p-5 border border-border mt-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <Text className="text-base font-medium text-foreground mb-4">
              Recent Sessions
            </Text>
            {history.length === 0 ? (
              <Text className="text-muted">No sessions yet.</Text>
            ) : (
              <View className="gap-3">
                {history.map((session) => {
                  const sessionAccuracy =
                    session.total > 0
                      ? Math.round((session.correct / session.total) * 100)
                      : 0;
                  return (
                    <View
                      key={session.id}
                      className="bg-secondary rounded-xl px-3 py-2"
                    >
                      <Text className="text-foreground font-medium">
                        {session.topicTitle}
                      </Text>
                      <Text className="text-xs text-muted mt-0.5">
                        {session.languageLabel}
                      </Text>
                      <Text className="text-xs text-muted mt-1">
                        {session.correct}/{session.total} correct ({sessionAccuracy}%)
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
