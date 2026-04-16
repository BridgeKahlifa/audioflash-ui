import { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";
import { useSRSQueue, useSavedReviews } from "../../lib/queries";
import { useAppTheme } from "../../lib/theme-context";
import {
  fetchFlashcards,
  startLesson,
  startReviewLifecycle,
  type ApiReview,
} from "../../lib/api";
import { setCurrentCards } from "../../lib/storage";
import type { Flashcard } from "../../lib/types";
import { useAnalytics } from "../../lib/analytics";

function formatReviewDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ReviewQueue() {
  const { fontFamily } = useAppTheme();
  const { session, profile } = useAuth();
  const posthog = useAnalytics();
  const { data: queue, refetch: refetchSRS, isStale: isSRSStale } = useSRSQueue();
  const { data: reviews = [], refetch: refetchReviews, isStale: isReviewsStale } = useSavedReviews();
  const [startingSRS, setStartingSRS] = useState(false);
  const [startingReviewId, setStartingReviewId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchSRS(), refetchReviews()]);
    setRefreshing(false);
  }

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

    posthog?.capture("review_srs_started", { card_count: queue.cards.length });
    setStartingSRS(true);
    setError("");

    try {
      const topicKey = "srs-review";
      // The server validates that every flashcard attempt belongs to the session's
      // category. SRS queues can span multiple categories, so filter to only the
      // first card's category. Remaining cards from other categories will appear
      // in the next SRS session.
      const categoryId = String(queue.cards[0].category_id);
      const categoryCards = queue.cards.filter(
        (card) => String(card.category_id) === categoryId,
      );
      const mappedCards: Flashcard[] = categoryCards.map((card, index) => ({
        id: index + 1,
        dbId: String(card.id),
        sourceText: card.source_text,
        romanization: card.romanization ?? "",
        translation: card.translation,
      }));

      await setCurrentCards(topicKey, mappedCards);

      const lessonSession = await startLesson(session.access_token, {
        profile_id: profileId,
        category_id: categoryId,
        difficulty: categoryCards[0].difficulty,
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

    posthog?.capture("review_named_started", {
      review_name: review.review_name,
      card_count: review.flashcard_ids.length,
    });
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
          <Text className="text-3xl font-semibold text-foreground tracking-tight" style={{ fontFamily }}>Review</Text>
          <Text className="text-muted mt-1" style={{ fontFamily }}>Spaced repetition &amp; saved reviews</Text>
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B4A" />}>
          <>
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-sm" style={{ fontFamily }}>{error}</Text>
              </View>
            ) : null}

              {/* ── SRS Queue ─────────────────────────────────── */}
              <Text className="text-sm font-semibold text-muted mb-3" style={{ fontFamily }}>Spaced Repetition</Text>

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
                  <Text className="text-foreground font-semibold" style={{ fontFamily }}>Due today</Text>
                </View>
                <Text className="text-5xl font-bold text-foreground" style={{ fontFamily }}>{queue?.due_count ?? 0}</Text>
                <Text className="text-muted text-sm mt-1" style={{ fontFamily }}>
                  {queue?.due_count === 0
                    ? "You're all caught up! Practice a lesson to add cards."
                    : `${queue?.due_count} card${queue?.due_count !== 1 ? "s" : ""} waiting for review`}
                </Text>
              </View>

              <View className="bg-accent border border-primary/10 rounded-2xl p-4 mb-4">
                <Text className="text-foreground text-sm leading-relaxed" style={{ fontFamily }}>
                  Spaced repetition schedules reviews right before you'd forget a card. Answer cards
                  you know well and they'll appear less often. Miss one and it comes back sooner.
                </Text>
              </View>

              {queue && queue.cards.length > 0 && (
                <View className="gap-3 mb-4">
                  <Text className="text-sm font-semibold text-muted" style={{ fontFamily }}>Due cards</Text>
                  {queue.cards.slice(0, 5).map((card) => (
                    <View key={card.id} className="bg-card border border-border rounded-2xl p-4">
                      <Text className="text-foreground font-medium" style={{ fontFamily }}>{card.source_text}</Text>
                      {card.romanization ? (
                        <Text className="text-muted text-sm mt-0.5" style={{ fontFamily }}>{card.romanization}</Text>
                      ) : null}
                      <Text className="text-foreground text-sm mt-1" style={{ fontFamily }}>{card.translation}</Text>
                    </View>
                  ))}
                  {queue.due_count > 5 && (
                    <Text className="text-muted text-xs text-center" style={{ fontFamily }}>
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
                    style={{ fontFamily }}
                  >
                    {queue?.due_count === 0 ? "Nothing due right now" : "Start SRS Review"}
                  </Text>
                )}
              </Pressable>

              {/* ── Named Reviews ─────────────────────────────── */}
              <Text className="text-sm font-semibold text-muted mb-3" style={{ fontFamily }}>Saved Reviews</Text>

              {reviews.length === 0 ? (
                <View className="bg-card border border-border rounded-2xl p-4 mb-4">
                  <Text className="text-muted text-sm" style={{ fontFamily }}>No saved reviews available.</Text>
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
                            <Text className="text-base font-semibold text-foreground" style={{ fontFamily }}>
                              {review.review_name}
                            </Text>
                            <Text className="text-sm text-muted mt-1" style={{ fontFamily }}>
                              {review.flashcard_ids.length} cards
                            </Text>
                            <Text className="text-xs text-muted mt-2" style={{ fontFamily }}>
                              Created {formatReviewDate(review.created_at)}
                            </Text>
                            {review.started_at ? (
                              <Text className="text-xs text-muted mt-1" style={{ fontFamily }}>
                                Started {formatReviewDate(review.started_at)}
                              </Text>
                            ) : null}
                          </View>
                          {isStarting ? (
                            <ActivityIndicator color="#FF6B4A" />
                          ) : (
                            <Text className="text-primary font-semibold" style={{ fontFamily }}>Open</Text>
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
