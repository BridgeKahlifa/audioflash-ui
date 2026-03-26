import { useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SessionHistoryItem } from "../lib/types";
import { getLastSession, setCurrentCards } from "../lib/storage";

export default function SessionSummary() {
  const [session, setSession] = useState<SessionHistoryItem | null>(null);

  useEffect(() => {
    getLastSession().then(setSession);
  }, []);

  const missed = useMemo(
    () => session?.cards.filter((card) => !card.knew) ?? [],
    [session]
  );

  const accuracy =
    session && session.total > 0
      ? Math.round((session.correct / session.total) * 100)
      : 0;

  async function retryMissed() {
    if (!session || missed.length === 0) return;

    await setCurrentCards(
      session.topic,
      missed.map((card, index) => ({
        id: index + 1,
        sourceText: card.sourceText,
        romanization: card.romanization,
        translation: card.translation,
      }))
    );

    router.replace({
      pathname: "/practice/[topic]",
      params: {
        topic: session.topic,
        topicTitle: `${session.topicTitle} (Retry)`,
        language: session.language,
        languageLabel: session.languageLabel,
      },
    });
  }

  if (!session) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center max-w-md w-full mx-auto">
          <Text className="text-muted">No recent session found.</Text>
          <Pressable
            onPress={() => router.replace("/")}
            className="mt-4 py-3 px-5 rounded-xl bg-primary"
          >
            <Text className="text-primary-foreground font-semibold">Go Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
          <Text className="text-2xl font-semibold text-foreground">Session Summary</Text>
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="bg-card border border-border rounded-2xl p-5 mb-4">
            <Text className="text-muted text-xs mb-2">{session.languageLabel} · {session.topicTitle}</Text>
            <Text className="text-3xl font-semibold text-foreground">{session.correct}/{session.total}</Text>
            <Text className="text-muted mt-1">Accuracy: {accuracy}%</Text>
            <Text className="text-muted mt-1">Missed: {missed.length}</Text>
          </View>

          <View className="bg-card border border-border rounded-2xl p-5 mb-4">
            <Text className="text-base font-medium text-foreground mb-3">Missed Cards</Text>
            {missed.length === 0 ? (
              <Text className="text-muted">Perfect run. Nothing to retry.</Text>
            ) : (
              <View className="gap-3">
                {missed.map((card) => (
                  <View key={`${card.cardId}-${card.sourceText}`} className="bg-secondary rounded-xl p-3">
                    <Text className="text-foreground text-lg">{card.sourceText}</Text>
                    <Text className="text-muted text-sm">{card.romanization}</Text>
                    <Text className="text-foreground text-sm mt-1">{card.translation}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View className="gap-3">
            <Pressable
              onPress={retryMissed}
              disabled={missed.length === 0}
              className={`py-4 rounded-2xl items-center ${missed.length > 0 ? "bg-primary" : "bg-secondary"}`}
            >
              <Text className={`font-semibold ${missed.length > 0 ? "text-primary-foreground" : "text-muted"}`}>
                Retry Missed Cards
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.replace("/progress")}
              className="py-4 rounded-2xl items-center bg-secondary"
            >
              <Text className="font-medium text-foreground">View Progress</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
