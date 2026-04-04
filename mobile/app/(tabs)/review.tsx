import { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";
import { useSRSQueue, useSavedReviews } from "../../lib/queries";
import {
  fetchFlashcards,
  startLesson,
  startReviewLifecycle,
  type ApiReview,
} from "../../lib/api";
import { setCurrentCards } from "../../lib/storage";
import type { Flashcard } from "../../lib/types";

function formatReviewDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ReviewQueue() {
  const { session, profile } = useAuth();
  const { data: queue, refetch: refetchSRS, isStale: isSRSStale } = useSRSQueue();
  const { data: reviews = [], refetch: refetchReviews, isStale: isReviewsStale } = useSavedReviews();
  const [startingSRS, setStartingSRS] = useState(false);
  const [startingReviewId, setStartingReviewId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isSRSStaleRef = useRef(false);
  isSRSStaleRef.current = isSRSStale;
  const isReviewsStaleRef = useRef(false);
  isReviewsStaleRef.current = isReviewsStale;

  useFocusEffect(
    useCallback(() => {
      if (isSRSStaleRef.current) refetchSRS();
      if (isReviewsStaleRef.current) refetchReviews();
    }, [refetchSRS, refetchReviews]),
  );

  async function startSRSReview() {
    if (!queue || queue.cards.length === 0 || !session?.access_token) return;

    const profileId = profile?.id ?? session.user?.id;
    if (!profileId) return;

    setStartingSRS(true);
    setError("");

    try {
      const topicKey = "srs-review";
      const mappedCards: Flashcard[] = queue.cards.map((card, index) => ({
        id: index + 1,
        dbId: String(card.id),
        sourceText: card.source_text,
        romanization: card.romanization ?? "",
        translation: card.translation,
      }));

      await setCurrentCards(topicKey, mappedCards);

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
          activityId: lessonSession.activity_id ?? lessonSession.session_id,
        },
      });
    } catch {
      setError("Couldn't start review session. Please try again.");
    } finally {
      setStartingSRS(false);
    }
  }

  async function startNamedReview(review: ApiReview) {
    if (!session?.access_token) return;

    setStartingReviewId(review.id);
    setError("");

    try {
      const startedReview = await startReviewLifecycle(session.access_token, review.id);
      if (!startedReview.activity_id) {
        setError("Couldn't start review session because the review activity is missing.");
        return;
      }

      const flashcards = await fetchFlashcards();
      const flashcardsById = new Map(flashcards.map((card) => [String(card.id), card]));
      const reviewCards: Flashcard[] = startedReview.flashcard_ids
        .map((flashcardId, index) => {
          const card = flashcardsById.get(String(flashcardId));
          if (!card) return null;
          return {
            id: index + 1,
            dbId: String(card.id),
            sourceText: card.source_text,
            romanization: card.romanization ?? "",
            translation: card.translation,
          };
        })
        .filter(Boolean) as Flashcard[];

      const topicKey = `review-${review.id}`;
      await setCurrentCards(topicKey, reviewCards);

      router.push({
        pathname: "/practice/[topic]",
        params: {
          topic: topicKey,
          topicTitle: startedReview.review_name,
          language: "review",
          languageLabel: "Review",
          reviewId: startedReview.id,
          activityId: startedReview.activity_id,
        },
      });
    } catch {
      setError("Couldn't start review session. Please try again.");
    } finally {
      setStartingReviewId(null);
    }
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        <View className="px-6 pt-8 pb-4">
          <Text className="text-3xl font-semibold text-foreground tracking-tight">Review</Text>
          <Text className="text-muted mt-1">Spaced repetition &amp; saved reviews</Text>
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
          <>
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-sm">{error}</Text>
              </View>
            ) : null}

              {/* ── SRS Queue ─────────────────────────────────── */}
              <Text className="text-sm font-semibold text-muted mb-3">Spaced Repetition</Text>

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

              <View className="bg-accent border border-primary/10 rounded-2xl p-4 mb-4">
                <Text className="text-foreground text-sm leading-relaxed">
                  Spaced repetition schedules reviews right before you'd forget a card. Answer cards
                  you know well and they'll appear less often. Miss one and it comes back sooner.
                </Text>
              </View>

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

              <Pressable
                onPress={startSRSReview}
                disabled={!queue || queue.due_count === 0 || startingSRS}
                className={`py-4 rounded-2xl items-center mb-8 ${queue && queue.due_count > 0 && !startingSRS ? "bg-primary" : "bg-secondary"
                  }`}
                style={
                  queue && queue.due_count > 0 && !startingSRS
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
                {startingSRS ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    className={`text-base font-semibold ${queue && queue.due_count > 0 ? "text-primary-foreground" : "text-muted"
                      }`}
                  >
                    {queue?.due_count === 0 ? "Nothing due right now" : "Start SRS Review"}
                  </Text>
                )}
              </Pressable>

              {/* ── Named Reviews ─────────────────────────────── */}
              <Text className="text-sm font-semibold text-muted mb-3">Saved Reviews</Text>

              {reviews.length === 0 ? (
                <View className="bg-card border border-border rounded-2xl p-4 mb-4">
                  <Text className="text-muted text-sm">No saved reviews available.</Text>
                </View>
              ) : (
                <View className="gap-3">
                  {reviews.map((review) => {
                    const isStarting = startingReviewId === review.id;
                    return (
                      <Pressable
                        key={review.id}
                        onPress={() => void startNamedReview(review)}
                        disabled={isStarting}
                        className="bg-card border border-border rounded-2xl p-4"
                        style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.05,
                          shadowRadius: 3,
                          elevation: 2,
                        }}
                      >
                        <View className="flex-row items-start justify-between gap-3">
                          <View className="flex-1">
                            <Text className="text-base font-semibold text-foreground">
                              {review.review_name}
                            </Text>
                            <Text className="text-sm text-muted mt-1">
                              {review.flashcard_ids.length} cards
                            </Text>
                            <Text className="text-xs text-muted mt-2">
                              Created {formatReviewDate(review.created_at)}
                            </Text>
                            {review.started_at ? (
                              <Text className="text-xs text-muted mt-1">
                                Started {formatReviewDate(review.started_at)}
                              </Text>
                            ) : null}
                          </View>
                          {isStarting ? (
                            <ActivityIndicator color="#FF6B4A" />
                          ) : (
                            <Text className="text-primary font-semibold">Open</Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
          </>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
