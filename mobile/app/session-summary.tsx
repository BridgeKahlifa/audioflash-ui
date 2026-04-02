import { useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { SessionHistoryItem } from "../lib/types";
import { getLastSession, setCurrentCards } from "../lib/storage";
import { useAuth } from "../lib/auth-context";
import { fetchCategoryGradeChart, startReviewLifecycle } from "../lib/api";

interface GradeHistoryPoint {
  endedAt: string;
  grade: number;
}

function formatChartTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function SimpleGradeHistoryChart({ points }: { points: GradeHistoryPoint[] }) {
  const chartHeight = 160;
  const yMin = 0;
  const yMax = 100;
  const yTicks = [100, 50, 0];
  const sortedPoints = [...points].sort(
    (a, b) => new Date(a.endedAt).getTime() - new Date(b.endedAt).getTime(),
  );
  const times = sortedPoints.map((point) => new Date(point.endedAt).getTime());
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeRange = Math.max(maxTime - minTime, 1);
  const chartWidth = Math.max(points.length * 84, 320);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const lineColor = "#F26B4A";
  const gridColor = "#E7DDD6";

  const normalizedPoints = sortedPoints.map((point, index) => {
    const timestamp = new Date(point.endedAt).getTime();
    const x = 16 + ((timestamp - minTime) / timeRange) * (chartWidth - 32);
    const y =
      chartHeight - ((point.grade - yMin) / Math.max(yMax - yMin, 1)) * (chartHeight - 24) - 12;
    return { ...point, x, y, index };
  });
  const activePoint = activeIndex == null ? null : normalizedPoints[activeIndex];
  const polylinePoints = normalizedPoints.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ minWidth: "100%" }}>
          <View className="flex-row" style={{ gap: 8, alignItems: "center" }}>
            <View
              style={{
                width: 20,
                height: chartHeight,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                className="text-xs text-muted"
                style={{
                  transform: [{ rotate: "-90deg" }],
                  width: 80,
                  textAlign: "center",
                }}
              >
                Grade
              </Text>
            </View>
            <View style={{ width: 28, height: chartHeight, justifyContent: "space-between", paddingVertical: 4 }}>
              {yTicks.map((tick) => (
                <Text key={tick} className="text-muted text-right" style={{ fontSize: 10 }}>
                  {tick}
                </Text>
              ))}
            </View>
            <View style={{ width: chartWidth + 24 }}>
              <View style={{ height: chartHeight, position: "relative" }}>
                <Svg width={chartWidth + 24} height={chartHeight} style={{ position: "absolute", left: 0, top: 0 }}>
                  {yTicks.map((tick) => {
                    const y =
                      chartHeight - ((tick - yMin) / Math.max(yMax - yMin, 1)) * (chartHeight - 24) - 12;
                    return (
                      <Line
                        key={tick}
                        x1="0"
                        y1={y}
                        x2={chartWidth + 24}
                        y2={y}
                        stroke={gridColor}
                        strokeWidth="1"
                      />
                    );
                  })}
                  {normalizedPoints.length > 1 ? (
                    <Polyline
                      points={polylinePoints}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ) : null}
                  {normalizedPoints.map((point) => (
                    <Circle
                      key={`${point.endedAt}-${point.grade}-${point.index}-dot`}
                      cx={point.x}
                      cy={point.y}
                      r="6"
                      fill={lineColor}
                      stroke="#FFF8F2"
                      strokeWidth="2"
                    />
                  ))}
                </Svg>
                {activePoint ? (
                  <View
                    style={{
                      position: "absolute",
                      left: Math.max(8, Math.min(activePoint.x - 52, chartWidth - 96)),
                      top: Math.max(0, activePoint.y - 76),
                      width: 116,
                      backgroundColor: "#FFFFFF",
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.12,
                      shadowRadius: 12,
                      elevation: 4,
                    }}
                  >
                    <Text className="text-foreground" style={{ fontSize: 10, fontWeight: "700" }}>
                      Grade: {activePoint.grade}
                    </Text>
                    <Text className="text-foreground mt-1" style={{ fontSize: 10 }}>
                      Time: {formatChartTime(activePoint.endedAt)}
                    </Text>
                  </View>
                ) : null}
                {normalizedPoints.map((point) => (
                  <Pressable
                    key={`${point.endedAt}-${point.grade}-${point.index}`}
                    onHoverIn={() => setActiveIndex(point.index)}
                    onHoverOut={() => setActiveIndex((current) => (current === point.index ? null : current))}
                    onPress={() => setActiveIndex((current) => (current === point.index ? null : point.index))}
                    style={{
                      position: "absolute",
                      left: point.x - 18,
                      top: point.y - 18,
                      width: 36,
                      height: 36,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  />
                ))}
              </View>
              <View className="flex-row justify-between mt-3">
                {normalizedPoints.map((point) => (
                  <Text
                    key={`${point.endedAt}-label`}
                    className="text-muted text-center"
                    style={{ fontSize: 10, width: 52 }}
                    numberOfLines={2}
                  >
                    {formatChartTime(point.endedAt)}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      <View className="flex-row justify-between mt-3">
        <Text className="text-xs text-muted" />
        <Text className="text-xs text-muted">Time</Text>
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
      typeof session.difficulty !== "number"
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
  }, [authSession?.access_token, session?.categoryId, session?.difficulty]);

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

          <View className="bg-card border border-border rounded-2xl p-5 mb-4">
            <Text className="text-base font-medium text-foreground mb-1">Session Chart</Text>
            <Text className="text-sm text-muted mb-4">
              This shows how your session grades changed over time. Higher points mean stronger performance, and sessions completed on the same day share the same time position.
            </Text>
            {loadingGradeHistory ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="small" color="#FF6B4A" />
              </View>
            ) : gradeHistoryError ? (
              <Text className="text-sm text-muted">{gradeHistoryError}</Text>
            ) : gradeHistory.length === 0 ? (
              <Text className="text-sm text-muted">
                No grade history is available for this session yet.
              </Text>
            ) : (
              <SimpleGradeHistoryChart points={gradeHistory} />
            )}
          </View>

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
