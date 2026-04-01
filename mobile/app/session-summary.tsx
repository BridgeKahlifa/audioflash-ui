import { useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { SessionHistoryItem } from "../lib/types";
import { getLastSession, setCurrentCards } from "../lib/storage";
import { useAuth } from "../lib/auth-context";
import { fetchCategoryGradeChart, startReviewLifecycle } from "../lib/api";

interface GradeHistoryPoint {
  endedAt: string;
  grade: number;
}

function formatChartDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function SimpleGradeHistoryChart({ points }: { points: GradeHistoryPoint[] }) {
  const max = Math.max(...points.map((point) => point.grade), 100);

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row items-end" style={{ height: 148, gap: 10, minWidth: "100%" }}>
          {points.map((point) => (
            <View key={`${point.endedAt}-${point.grade}`} className="items-center" style={{ gap: 6, width: 28 }}>
              <Text
                style={{
                  fontSize: 10,
                  color: "#FF6B4A",
                  fontWeight: "600",
                }}
              >
                {point.grade}
              </Text>
              <View
                style={{
                  width: 18,
                  height: Math.max((point.grade / max) * 92, 4),
                  backgroundColor: "#FF6B4A",
                  borderRadius: 999,
                }}
              />
              <Text
                className="text-muted text-center"
                style={{ fontSize: 10, width: 34 }}
                numberOfLines={2}
              >
                {formatChartDate(point.endedAt)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View className="flex-row justify-between mt-3">
        <Text className="text-xs text-muted">Grade</Text>
        <Text className="text-xs text-muted">Recent sessions</Text>
      </View>
    </View>
  );
}

export default function SessionSummary() {
  const { session: authSession } = useAuth();
  const [session, setSession] = useState<SessionHistoryItem | null>(null);
  const [startingReview, setStartingReview] = useState(false);
  const [gradeHistory, setGradeHistory] = useState<GradeHistoryPoint[]>([]);
  const [loadingGradeHistory, setLoadingGradeHistory] = useState(false);
  const [gradeHistoryError, setGradeHistoryError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getLastSession().then(setSession);
  }, []);

  useEffect(() => {
    if (
      !authSession?.access_token ||
      !session?.categoryId ||
      typeof session.difficulty !== "number" ||
      session.reviewId
    ) {
      setGradeHistory([]);
      setLoadingGradeHistory(false);
      setGradeHistoryError("");
      return;
    }

    let cancelled = false;
    setLoadingGradeHistory(true);
    setGradeHistoryError("");

    fetchCategoryGradeChart(
      authSession.access_token,
      session.categoryId,
      session.difficulty,
    )
      .then((response) => {
        if (cancelled) return;
        setGradeHistory(
          response.points.map((point) => ({
            endedAt: point.ended_at,
            grade: point.grade,
          })),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setGradeHistoryError("Couldn't load grade history right now.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingGradeHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authSession?.access_token, session?.categoryId, session?.difficulty, session?.reviewId]);

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

    setError("");
    const topicKey = session.reviewId ? `review-${session.reviewId}` : session.topic;

    await setCurrentCards(
      topicKey,
      missed.map((card, index) => ({
        id: index + 1,
        dbId: typeof card.cardId === "string" ? card.cardId : undefined,
        sourceText: card.sourceText,
        romanization: card.romanization,
        translation: card.translation,
      }))
    );

    if (session.reviewId) {
      if (!authSession?.access_token) {
        setError("Sign in again to start this review.");
        return;
      }

      try {
        setStartingReview(true);
        const startedReview = await startReviewLifecycle(
          authSession.access_token,
          session.reviewId,
        );
        if (!startedReview.activity_id) {
          setError("Couldn't start the missed-cards review because the review activity is missing.");
          return;
        }

        router.replace({
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
        return;
      } catch {
        setError("Couldn't start the missed-cards review. Please try again.");
        return;
      } finally {
        setStartingReview(false);
      }
    }

    router.replace({
      pathname: "/practice/[topic]",
      params: {
        topic: topicKey,
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
          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          ) : null}

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

          {!session.reviewId && session.categoryId && typeof session.difficulty === "number" ? (
            <View className="bg-card border border-border rounded-2xl p-5 mb-4">
              <Text className="text-base font-medium text-foreground mb-1">Grade History</Text>
              <Text className="text-sm text-muted mb-4">
                Recent grades for this lesson and difficulty
              </Text>
              {loadingGradeHistory ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="small" color="#FF6B4A" />
                </View>
              ) : gradeHistoryError ? (
                <Text className="text-sm text-muted">{gradeHistoryError}</Text>
              ) : gradeHistory.length === 0 ? (
                <Text className="text-sm text-muted">No grade history yet.</Text>
              ) : (
                <SimpleGradeHistoryChart points={gradeHistory} />
              )}
            </View>
          ) : null}

          <View className="gap-3">
            <Pressable
              onPress={retryMissed}
              disabled={missed.length === 0 || startingReview}
              className={`py-4 rounded-2xl items-center ${missed.length > 0 && !startingReview ? "bg-primary" : "bg-secondary"}`}
            >
              {startingReview ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className={`font-semibold ${missed.length > 0 ? "text-primary-foreground" : "text-muted"}`}>
                  {session.reviewId ? "Review Missed Cards" : "Retry Missed Cards"}
                </Text>
              )}
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
