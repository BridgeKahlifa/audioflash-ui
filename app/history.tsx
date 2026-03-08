import { useEffect, useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SessionHistoryItem } from "../lib/types";
import { getSessionHistory } from "../lib/storage";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);

  useEffect(() => {
    getSessionHistory().then(setHistory);
  }, []);

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
          <Text className="text-2xl font-semibold text-foreground">History</Text>
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
          {history.length === 0 ? (
            <View className="bg-card border border-border rounded-2xl p-5">
              <Text className="text-muted">No sessions yet.</Text>
            </View>
          ) : (
            <View className="gap-3">
              {history.map((session) => {
                const accuracy =
                  session.total > 0 ? Math.round((session.correct / session.total) * 100) : 0;

                return (
                  <View key={session.id} className="bg-card border border-border rounded-2xl p-4">
                    <Text className="text-foreground font-medium">{session.topicTitle}</Text>
                    <Text className="text-muted text-xs mt-1">{session.languageLabel}</Text>
                    <Text className="text-muted text-xs mt-1">{formatDateTime(session.completedAt)}</Text>
                    <View className="flex-row items-center justify-between mt-3">
                      <Text className="text-foreground">{session.correct}/{session.total} correct</Text>
                      <Text className="text-muted">{accuracy}%</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
