import { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";
import { fetchSRSQueue, startLesson, type ApiSRSQueue } from "../../lib/api";
import { setCurrentCards } from "../../lib/storage";
import type { Flashcard } from "../../lib/types";

export default function ReviewQueue() {
  const { session, profile } = useAuth();
  const [queue, setQueue] = useState<ApiSRSQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      async function load() {
        if (!session?.access_token) {
          setLoading(false);
          return;
        }
        setLoading(true);
        setError("");
        try {
          const data = await fetchSRSQueue(session.access_token);
          setQueue(data);
        } catch {
          setError("Couldn't load your review queue. Check your connection.");
        } finally {
          setLoading(false);
        }
      }
      load();
    }, [session?.access_token]),
  );

  async function startReview() {
    if (!queue || queue.cards.length === 0 || !session?.access_token) return;

    const profileId = profile?.id ?? session.user?.id;
    if (!profileId) return;

    setStarting(true);
    setError("");

    try {
      const topicKey = "srs-review";
      const mappedCards: Flashcard[] = queue.cards.map((card, index) => ({
        id: index + 1,
        dbId: String(card.id),
        chinese: card.source_text,
        pinyin: card.romanization ?? "",
        english: card.translation,
      }));

      await setCurrentCards(topicKey, mappedCards);

      // Use the first card's category_id for the session
      const categoryId = String(queue.cards[0].category_id);
      const lessonSession = await startLesson(session.access_token, {
        profile_id: profileId,
        category_id: categoryId,
        started_at: new Date().toISOString(),
      });

      router.push({
        pathname: "/practice/[topic]",
        params: {
          topic: topicKey,
          topicTitle: "SRS Review",
          language: "mixed",
          languageLabel: "Review",
          apiLoaded: "true",
          lessonSessionId: lessonSession.session_id,
        },
      });
    } catch {
      setError("Couldn't start review session. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        <View className="px-6 pt-8 pb-4">
          <Text className="text-3xl font-semibold text-foreground tracking-tight">Review</Text>
          <Text className="text-muted mt-1">Cards due for spaced repetition</Text>
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
          {loading ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#FF6B4A" />
            </View>
          ) : error ? (
            <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          ) : (
            <>
              {/* Due count card */}
              <View
                className="bg-card border border-border rounded-2xl p-5 mb-4"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center gap-3 mb-3">
                  <View className="w-10 h-10 rounded-xl bg-accent items-center justify-center">
                    <Ionicons name="refresh-circle" size={22} color="#FF6B4A" />
                  </View>
                  <Text className="text-foreground font-semibold">Due today</Text>
                </View>
                <Text className="text-5xl font-bold text-foreground">{queue?.due_count ?? 0}</Text>
                <Text className="text-muted text-sm mt-1">
                  {queue?.due_count === 0
                    ? "You're all caught up! Practice a lesson to add cards."
                    : `${queue?.due_count} card${queue?.due_count !== 1 ? "s" : ""} waiting for review`}
                </Text>
              </View>

              {/* Info */}
              <View className="bg-accent border border-primary/10 rounded-2xl p-4 mb-4">
                <Text className="text-foreground text-sm leading-relaxed">
                  Spaced repetition schedules reviews right before you'd forget a card. Answer cards
                  you know well and they'll appear less often. Miss one and it comes back sooner.
                </Text>
              </View>

              {/* Due cards preview */}
              {queue && queue.cards.length > 0 && (
                <View className="gap-3 mb-4">
                  <Text className="text-sm font-semibold text-muted">Due cards</Text>
                  {queue.cards.slice(0, 5).map((card) => (
                    <View key={card.id} className="bg-card border border-border rounded-2xl p-4">
                      <Text className="text-foreground font-medium">{card.source_text}</Text>
                      {card.romanization ? (
                        <Text className="text-muted text-sm mt-0.5">{card.romanization}</Text>
                      ) : null}
                      <Text className="text-foreground text-sm mt-1">{card.translation}</Text>
                    </View>
                  ))}
                  {queue.due_count > 5 && (
                    <Text className="text-muted text-xs text-center">
                      +{queue.due_count - 5} more cards
                    </Text>
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>

        <View className="px-6 pb-6 pt-2">
          <Pressable
            onPress={startReview}
            disabled={!queue || queue.due_count === 0 || starting || loading}
            className={`py-4 rounded-2xl items-center ${
              queue && queue.due_count > 0 && !starting ? "bg-primary" : "bg-secondary"
            }`}
            style={
              queue && queue.due_count > 0 && !starting
                ? {
                    shadowColor: "#FF6B4A",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                  }
                : undefined
            }
          >
            {starting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                className={`text-base font-semibold ${
                  queue && queue.due_count > 0 ? "text-primary-foreground" : "text-muted"
                }`}
              >
                {queue?.due_count === 0 ? "Nothing due right now" : "Start Review Session"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
