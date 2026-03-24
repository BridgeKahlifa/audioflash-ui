import { useCallback, useState } from "react";
import { ScrollView, View, Text, Pressable, ActivityIndicator } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  fetchFlashcards,
  fetchReviews,
  startReviewLifecycle,
  type ApiReview,
} from "../../lib/api";
import { setCurrentCards } from "../../lib/storage";
import { useAuth } from "../../lib/auth-context";

function formatReviewDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown date";
  }

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ReviewQueue() {
  const { session } = useAuth();
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingReviewId, setStartingReviewId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchReviews(session?.access_token);
      setReviews(data.filter((review) => !review.ended_at));
    } catch (loadError) {
      console.error("Failed to load reviews", loadError);
      setError("We couldn't load your reviews right now.");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useFocusEffect(
    useCallback(() => {
      void loadReviews();
    }, [loadReviews])
  );

  async function startReview(review: ApiReview) {
    if (startingReviewId) return;

    setStartingReviewId(review.id);
    setError("");

    try {
      const startedReview = await startReviewLifecycle(
        session?.access_token,
        review.id,
      );
      setReviews((currentReviews) =>
        currentReviews.map((currentReview) =>
          currentReview.id === startedReview.id ? startedReview : currentReview,
        ),
      );

      const flashcards = await fetchFlashcards();
      const flashcardsById = new Map(flashcards.map((card) => [String(card.id), card]));
      const reviewCards = startedReview.flashcard_ids
        .map((flashcardId, index) => {
          const card = flashcardsById.get(String(flashcardId));
          if (!card) return null;

          return {
            id: index + 1,
            dbId: String(card.id),
            chinese: card.source_text,
            pinyin: card.romanization ?? "",
            english: card.translation,
          };
        })
        .filter((card): card is NonNullable<typeof card> => card !== null);

      if (reviewCards.length === 0) {
        setError("This review doesn't have any flashcards available yet.");
        return;
      }

      const topic = `review-${review.id}`;
      await setCurrentCards(topic, reviewCards);

      router.push({
        pathname: "/practice/[topic]",
        params: {
          topic,
          topicTitle: startedReview.review_name,
          language: "review",
          languageLabel: "Review",
          reviewId: startedReview.id,
        },
      });
    } catch (startError) {
      console.error("Failed to start review", startError);
      setError("We couldn't open that review right now.");
    } finally {
      setStartingReviewId(null);
    }
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
          <Text className="text-2xl font-semibold text-foreground">Reviews</Text>
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="bg-accent border border-primary rounded-2xl p-4 mb-4">
            <Text className="text-foreground text-sm">
              Tap a review to reopen the missed flashcards from that session.
            </Text>
          </View>

          {loading ? (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator size="large" color="#FF6B4A" />
            </View>
          ) : null}

          {!loading && error ? (
            <View className="bg-card border border-red-200 rounded-2xl p-4 mb-4">
              <Text className="text-red-500">{error}</Text>
            </View>
          ) : null}

          {!loading && reviews.length === 0 ? (
            <View className="bg-card border border-border rounded-2xl p-4">
              <Text className="text-muted">No reviews available right now.</Text>
            </View>
          ) : null}

          <View className="gap-3">
            {reviews.map((review) => {
              const isStarting = startingReviewId === review.id;

              return (
                <Pressable
                  key={review.id}
                  onPress={() => void startReview(review)}
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
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
