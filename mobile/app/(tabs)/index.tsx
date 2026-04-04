import { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";
import { useAnalytics } from "../../lib/analytics";
import { useSRSQueue, useInProgressLesson, useInProgressLessonName } from "../../lib/queries";

const LOGO_IMAGE = require("../../assets/AudioFlashLogo3.png");


export default function Home() {
  const { profile } = useAuth();
  const posthog = useAnalytics();
  const {
    data: srsQueue,
    refetch: refetchSRS,
    isStale: isSRSStale,
    error: srsError,
  } = useSRSQueue();
  const {
    data: inProgressLesson,
    refetch: refetchLesson,
    isStale: isLessonStale,
    error: lessonError,
  } = useInProgressLesson();
  const inProgressLessonName = useInProgressLessonName();
  const [continuingLesson, setContinuingLesson] = useState(false);
  const loadError =
    srsError || lessonError
      ? "We had trouble loading part of your home screen. Please try again in a moment."
      : "";

  // Refs hold the current staleness so the useFocusEffect callback reads the
  // live value without needing to be recreated every time isStale changes.
  const isSRSStaleRef = useRef(false);
  isSRSStaleRef.current = isSRSStale;
  const isLessonStaleRef = useRef(false);
  isLessonStaleRef.current = isLessonStale;

  useFocusEffect(
    useCallback(() => {
      if (isSRSStaleRef.current) refetchSRS();
      if (isLessonStaleRef.current) refetchLesson();
    }, [refetchSRS, refetchLesson]),
  );

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = profile?.name?.split(" ")[0] ?? null;
  async function handleContinueLesson() {
    if (!inProgressLesson || continuingLesson) return;

    posthog?.capture("home_action_tapped", {
      action: "continue_lesson",
      category_id: inProgressLesson.category_id,
      lesson_session_id: inProgressLesson.session_id,
    });

    setContinuingLesson(true);
    try {
      router.push({
        pathname: "/practice/[topic]",
        params: {
          topic: `session-${inProgressLesson.session_id}`,
          topicTitle: inProgressLessonName ?? "Current Lesson",
          resumeSession: "true",
          initialCurrentIndex: String(inProgressLesson.current_index),
          lessonStatus: inProgressLesson.status,
          apiCategoryId: inProgressLesson.category_id,
          apiLoaded: "true",
          lessonSessionId: inProgressLesson.session_id,
          activityId: inProgressLesson.activity_id ?? inProgressLesson.session_id,
        },
      });
    } finally {
      setContinuingLesson(false);
    }
  }

  function handleBrowseCategories() {
    posthog?.capture("home_action_tapped", {
      action: "browse_categories",
      has_preferred_language: Boolean(profile?.target_language_ids?.[0]),
    });
    router.push("/(tabs)/categories");
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="max-w-md w-full mx-auto">
          {/* Header */}
          <View className="px-6 pt-8 pb-6">
            <Image
              source={LOGO_IMAGE}
              style={{ width: 88, height: 88, marginBottom: 20, alignSelf: "center" }}
              resizeMode="contain"
            />
            <Text className="text-3xl font-semibold text-foreground tracking-tight">
              {firstName ? `${greeting}, ${firstName}` : greeting}
            </Text>
            {profile?.streak_count != null && profile.streak_count > 0 ? (
              <View className="flex-row items-center mt-1.5 gap-1">
                <Text style={{ fontSize: 14 }}>🔥</Text>
                <Text className="text-muted text-sm">
                  {profile.streak_count} day streak
                </Text>
              </View>
            ) : (
              <Text className="text-muted mt-1 text-sm">Start practicing to build your streak</Text>
            )}
          </View>

          {loadError ? (
            <View className="mx-6 mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <Text className="text-red-600 text-sm">{loadError}</Text>
            </View>
          ) : null}

          {/* SRS due card */}
          {srsQueue != null && srsQueue.due_count > 0 && (
            <Pressable
              onPress={() => { posthog?.capture("home_action_tapped", { action: "srs_review", due_count: srsQueue.due_count }); router.push("/(tabs)/review"); }}
              className="mx-6 mb-4 rounded-2xl p-4 flex-row items-center bg-primary"
              style={{
                shadowColor: "#FF6B4A",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center mr-3">
                <Ionicons name="refresh-circle" size={22} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">
                  {srsQueue.due_count} card{srsQueue.due_count !== 1 ? "s" : ""} due for review
                </Text>
                <Text className="text-white/75 text-xs mt-0.5">Tap to start your review session</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          )}

          {/* Quick actions */}
          <View className="px-6 mb-2">
            <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
              Start Learning
            </Text>
          </View>

          <View className="px-6 gap-3">
            {inProgressLesson ? (
              <Pressable
                onPress={() => void handleContinueLesson()}
                disabled={continuingLesson}
                className="rounded-2xl p-5 bg-primary flex-row items-center"
                style={{
                  shadowColor: "#FF6B4A",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <View className="w-12 h-12 rounded-xl bg-white/20 items-center justify-center mr-4">
                  {continuingLesson ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Ionicons name="play-circle" size={24} color="#FFFFFF" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base">Continue Lesson</Text>
                  <Text className="text-white/75 text-sm mt-0.5">
                    {inProgressLessonName ?? "Resume where you left off"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
              </Pressable>
            ) : null}

            {/* Generate a Lesson */}
            <Pressable
              onPress={() => { posthog?.capture("home_action_tapped", { action: "generate_lesson" }); router.push("/generate"); }}
              className="rounded-2xl p-5 bg-card border border-border flex-row items-center"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="w-12 h-12 rounded-xl bg-accent items-center justify-center mr-4">
                <Ionicons name="sparkles" size={24} color="#FF6B4A" />
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-semibold text-base">Generate a Lesson</Text>
                <Text className="text-muted text-sm mt-0.5">
                  Type any topic — AI builds cards for you
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A0A0A0" />
            </Pressable>

            {/* Browse Categories */}
            <Pressable
              onPress={handleBrowseCategories}
              className="rounded-2xl p-5 bg-card border border-border flex-row items-center"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="w-12 h-12 rounded-xl bg-secondary items-center justify-center mr-4">
                <Ionicons name="grid" size={24} color="#1A1A1A" />
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-semibold text-base">Browse Categories</Text>
                <Text className="text-muted text-sm mt-0.5">Pick a language and topic to practice</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A0A0A0" />
            </Pressable>

            {/* My Library */}
            <Pressable
              onPress={() => { posthog?.capture("home_action_tapped", { action: "my_library" }); router.push("/my-library"); }}
              className="rounded-2xl p-5 bg-card border border-border flex-row items-center"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="w-12 h-12 rounded-xl bg-secondary items-center justify-center mr-4">
                <Ionicons name="bookmark" size={24} color="#1A1A1A" />
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-semibold text-base">My Library</Text>
                <Text className="text-muted text-sm mt-0.5">
                  Saved lessons and AI-generated packs
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A0A0A0" />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
