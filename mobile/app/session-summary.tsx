import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { SessionHistoryItem } from "../lib/types";
import { getLastSession, setCurrentCards } from "../lib/storage";
import { useAuth } from "../lib/auth-context";
import { fetchCategoryGradeChart, startReviewLifecycle } from "../lib/api";
import { useAnalytics } from "../lib/analytics";

interface GradeHistoryPoint {
  endedAt: string;
  grade: number;
}

function formatChartTime(dateInput: string | number): string {
  return new Date(dateInput).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
}

function formatChartDate(dateInput: string | number): string {
  return new Date(dateInput).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatChartDateTime(dateInput: string | number): string {
  return new Date(dateInput).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getLocalDayStart(dateInput: string | number): number {
  const date = new Date(dateInput);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getLocalDayKey(dateInput: string | number): string {
  const date = new Date(dateInput);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function SimpleGradeHistoryChart({ points }: { points: GradeHistoryPoint[] }) {
  const chartHeight = 160;
  const labelWidth = 52;
  const yMin = 0;
  const yMax = 100;
  const yTicks = [100, 50, 0];
  const dayMs = 24 * 60 * 60 * 1000;
  const [chartAreaWidth, setChartAreaWidth] = useState(240);
  const sortedPoints = [...points]
    .map((point, index) => ({ ...point, originalIndex: index }))
    .sort((a, b) => {
      const timeDiff = new Date(a.endedAt).getTime() - new Date(b.endedAt).getTime();
      return timeDiff !== 0 ? timeDiff : a.originalIndex - b.originalIndex;
    });
  const dayKeys = Array.from(new Set(sortedPoints.map((point) => getLocalDayKey(point.endedAt))));
  const spansMultipleDays = dayKeys.length > 1;
  const pointsPerDay = new Map<string, number>();

  sortedPoints.forEach((point) => {
    const dayKey = getLocalDayKey(point.endedAt);
    pointsPerDay.set(dayKey, (pointsPerDay.get(dayKey) ?? 0) + 1);
  });

  const seenPerDay = new Map<string, number>();
  const times = sortedPoints.map((point) => {
    if (!spansMultipleDays) {
      return new Date(point.endedAt).getTime();
    }

    const dayKey = getLocalDayKey(point.endedAt);
    const countForDay = pointsPerDay.get(dayKey) ?? 1;
    const indexWithinDay = seenPerDay.get(dayKey) ?? 0;
    seenPerDay.set(dayKey, indexWithinDay + 1);

    const fractionOfDay = countForDay === 1 ? 0.5 : (indexWithinDay + 1) / (countForDay + 1);
    return getLocalDayStart(point.endedAt) + fractionOfDay * dayMs;
  });
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeRange = Math.max(maxTime - minTime, 1);
  const chartWidth = Math.max(chartAreaWidth, 240);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const lineColor = "#F26B4A";
  const gridColor = "#E7DDD6";

  const normalizedPoints = sortedPoints.map((point, index) => {
    const timestamp = times[index];
    const x = 16 + ((timestamp - minTime) / timeRange) * (chartWidth - 32);
    const y =
      chartHeight - ((point.grade - yMin) / Math.max(yMax - yMin, 1)) * (chartHeight - 24) - 12;
    return { ...point, x, y, index };
  });
  const activePoint = activeIndex == null ? null : normalizedPoints[activeIndex];
  const polylinePoints = normalizedPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const tickCount = Math.min(6, Math.max(4, normalizedPoints.length > 1 ? 5 : 1));
  const timeTicks = Array.from({ length: tickCount }, (_, index) => {
    const ratio = tickCount === 1 ? 0 : index / (tickCount - 1);
    const tickTime = minTime + timeRange * ratio;
    const x = 16 + ((tickTime - minTime) / timeRange) * (chartWidth - 32);
    return { tickTime, x, label: spansMultipleDays ? formatChartDate(tickTime) : formatChartTime(tickTime) };
  });

  return (
    <Pressable onPress={() => setActiveIndex(null)}>
      <View
        style={{ width: "100%" }}
        onLayout={(event) => {
          const nextWidth = Math.floor(event.nativeEvent.layout.width - 56);
          if (nextWidth > 0 && nextWidth !== chartAreaWidth) {
            setChartAreaWidth(nextWidth);
          }
        }}
      >
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
                      strokeWidth="2"
                      strokeOpacity="0.45"
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
                      {formatChartDateTime(activePoint.endedAt)}
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
              <View style={{ height: 28, marginTop: 12, position: "relative" }}>
                {timeTicks.map((tick, index) => (
                  <Text
                    key={`${tick.tickTime}-${index}`}
                    className="text-muted text-center"
                    style={{
                      position: "absolute",
                      left: tick.x - labelWidth / 2,
                      width: labelWidth,
                      fontSize: 10,
                    }}
                    numberOfLines={2}
                  >
                    {tick.label}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>
      <View className="flex-row mt-3" style={{ paddingLeft: 56 }}>
        <Text className="text-xs text-muted" style={{ width: chartWidth + 24, textAlign: "center" }}>
          Time
        </Text>
      </View>
    </Pressable>
  );
}

export default function SessionSummary() {
  const { session: authSession } = useAuth();
  const posthog = useAnalytics();
  const { categoryId: categoryIdParam, difficulty: difficultyParam } = useLocalSearchParams<{
    categoryId?: string;
    difficulty?: string;
  }>();
  const [session, setSession] = useState<SessionHistoryItem | null>(null);
  const [startingReview, setStartingReview] = useState(false);
  const [gradeHistory, setGradeHistory] = useState<GradeHistoryPoint[]>([]);
  const [loadingGradeHistory, setLoadingGradeHistory] = useState(false);
  const [gradeHistoryError, setGradeHistoryError] = useState("");
  const [error, setError] = useState("");
  const effectiveCategoryId = session?.categoryId ?? categoryIdParam;
  const parsedDifficulty =
    typeof difficultyParam === "string" && difficultyParam.length > 0
      ? Number(difficultyParam)
      : NaN;
  const effectiveDifficulty =
    typeof session?.difficulty === "number"
      ? session.difficulty
      : Number.isFinite(parsedDifficulty)
        ? parsedDifficulty
        : undefined;

  useEffect(() => {
    getLastSession().then(setSession);
  }, []);

  useEffect(() => {
    if (
      !authSession?.access_token ||
      !effectiveCategoryId ||
      typeof effectiveDifficulty !== "number"
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
      effectiveCategoryId,
      effectiveDifficulty,
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
  }, [authSession?.access_token, effectiveCategoryId, effectiveDifficulty]);

  const missed = useMemo(
    () => session?.cards.filter((card) => !card.knew) ?? [],
    [session]
  );
  const missedCount =
    typeof session?.missedCount === "number" ? session.missedCount : missed.length;

  const accuracy =
    session && session.total > 0
      ? Math.round((session.correct / session.total) * 100)
      : 0;

  async function retryMissed() {
    if (!session || missed.length === 0) return;

    posthog?.capture("session_summary_retry_missed", {
      missed_count: missed.length,
      is_review: Boolean(session.reviewId),
      language: session.languageLabel,
      topic: session.topicTitle,
    });

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
            <Text className="text-muted mt-1">Missed: {missedCount}</Text>
          </View>

          <View className="bg-card border border-border rounded-2xl p-5 mb-4">
            <Text className="text-base font-medium text-foreground mb-3">Missed Cards</Text>
            {missed.length === 0 ? (
              <Text className="text-muted">
                {missedCount === 0
                  ? "Perfect run. Nothing to retry."
                  : "Missed cards from earlier in this resumed lesson are not available to list here."}
              </Text>
            ) : (
              <View className="gap-3">
                {missedCount > missed.length ? (
                  <Text className="text-muted text-sm">
                    Showing missed cards from this segment of the lesson.
                  </Text>
                ) : null}
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
            <Text className="text-base font-medium text-foreground mb-1">Score History</Text>
            <Text className="text-sm text-muted mb-4">
              This shows how your lesson scores changed over time.
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
