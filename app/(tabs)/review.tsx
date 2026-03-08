import { useEffect, useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ReviewCard } from "../../lib/types";
import { getDueReviewCards, getReviewQueue, setCurrentCards } from "../../lib/storage";

export default function ReviewQueue() {
  const [dueCards, setDueCards] = useState<ReviewCard[]>([]);
  const [totalQueue, setTotalQueue] = useState(0);

  async function load() {
    const [due, all] = await Promise.all([getDueReviewCards(), getReviewQueue()]);
    setDueCards(due);
    setTotalQueue(all.length);
  }

  useEffect(() => {
    load();
  }, []);

  async function startReview() {
    if (dueCards.length === 0) return;

    await setCurrentCards(
      "review",
      dueCards.map((card, index) => ({
        id: index + 1,
        chinese: card.chinese,
        pinyin: card.pinyin,
        english: card.english,
      }))
    );

    router.push({
      pathname: "/practice/[topic]",
      params: {
        topic: "review",
        topicTitle: "Review Queue",
        language: "mixed",
        languageLabel: "Mixed",
      },
    });
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
          <Text className="text-2xl font-semibold text-foreground">Missed Cards Review</Text>
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="bg-accent border border-primary rounded-2xl p-4 mb-4">
            <Text className="text-foreground text-sm">
              This screen is for cards you previously missed. Practicing these cards
              improves long-term retention.
            </Text>
          </View>
          <View className="bg-card border border-border rounded-2xl p-5 mb-4">
            <Text className="text-3xl font-semibold text-foreground mt-1">{dueCards.length}</Text>
            <Text className="text-muted mt-1">Total in queue: {totalQueue}</Text>
          </View>

          <Pressable
            onPress={startReview}
            disabled={dueCards.length === 0}
            className={`py-4 rounded-2xl items-center mb-4 ${dueCards.length > 0 ? "bg-primary" : "bg-secondary"}`}
          >
            <Text className={`font-semibold ${dueCards.length > 0 ? "text-primary-foreground" : "text-muted"}`}>
              Practice Missed Cards
            </Text>
          </Pressable>

          <View className="gap-3">
            {dueCards.length === 0 ? (
              <View className="bg-card border border-border rounded-2xl p-4">
                <Text className="text-muted">No missed cards right now.</Text>
              </View>
            ) : (
              dueCards.map((card) => (
                <View key={card.id} className="bg-card border border-border rounded-2xl p-4">
                  <Text className="text-foreground text-lg">{card.chinese}</Text>
                  <Text className="text-muted text-sm">{card.pinyin}</Text>
                  <Text className="text-foreground text-sm mt-1">{card.english}</Text>
                  <Text className="text-xs text-muted mt-2">{card.languageLabel} · {card.topicTitle}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
