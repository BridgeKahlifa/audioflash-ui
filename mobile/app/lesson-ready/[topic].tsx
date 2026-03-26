import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { setCurrentCards, getSettings } from "../../lib/storage";
import { Flashcard } from "../../lib/types";
import { fetchLessonsByCategory, startLesson, saveLesson, unsaveLesson } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

export default function LessonReady() {
  const { profile, session } = useAuth();
  const { topic, topicTitle, language, languageLabel, apiLanguageId, apiCategoryId, apiLoaded, supportedDifficulties } =
    useLocalSearchParams<{
      topic: string;
      topicTitle: string;
      language?: string;
      languageLabel?: string;
      apiLanguageId?: string;
      apiCategoryId?: string;
      apiLoaded?: string;
      supportedDifficulties?: string;
    }>();

  const [status, setStatus] = useState<"ready" | "empty" | "error">("ready");
  const [starting, setStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const startLockRef = useRef(false);
  const availableDifficulties = (supportedDifficulties ?? "")
    .split(",")
    .map((value) => Number(value))
    .filter((value, index, values) => Number.isFinite(value) && !values.slice(0, index).includes(value))
    .sort((a, b) => a - b);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(
    availableDifficulties[0] ?? null
  );
  const canStart = Boolean(apiCategoryId) && selectedDifficulty !== null && !starting;

  useEffect(() => {
    setSelectedDifficulty(availableDifficulties[0] ?? null);
  }, [supportedDifficulties]);

  useEffect(() => {
    if (!apiCategoryId) {
      setStatus("error");
      setErrorMessage("Lesson details are missing. Please choose a category again.");
      return;
    }
    if (availableDifficulties.length === 0) {
      setStatus("error");
      setErrorMessage("No difficulty options are available for this category yet.");
      return;
    }
    setStatus("ready");
    setErrorMessage("");
  }, [apiCategoryId, supportedDifficulties]);

  async function handleToggleSave() {
    if (!session?.access_token || !apiCategoryId || saving) return;
    setSaving(true);
    try {
      if (saved) {
        await unsaveLesson(session.access_token, apiCategoryId);
        setSaved(false);
      } else {
        await saveLesson(session.access_token, apiCategoryId);
        setSaved(true);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  const handleStart = async () => {
    if (!apiCategoryId || selectedDifficulty === null || starting || startLockRef.current) {
      return;
    }

    const profileId = profile?.id ?? session?.user?.id;
    if (!profileId) {
      setErrorMessage("We couldn't find your learner profile. Please sign in again.");
      return;
    }

    startLockRef.current = true;
    setStarting(true);
    setErrorMessage("");

    try {
      const settings = await getSettings();
      const cardsToFetch = profile?.cards_per_session ?? settings.cardsPerSession;
      const lessonCards = await fetchLessonsByCategory({
        categoryId: apiCategoryId,
        limit: cardsToFetch,
        difficulty: selectedDifficulty,
      });

      if (lessonCards.length === 0) {
        setStatus("empty");
        setErrorMessage("No flashcards were returned for that difficulty. Try another level.");
        return;
      }

      const mappedCards: Flashcard[] = lessonCards.map((card, index) => ({
        id: index + 1,
        dbId: String(card.id),
        chinese: card.source_text,
        pinyin: card.romanization ?? "",
        english: card.translation,
      }));

      const lessonSession = await startLesson(session?.access_token, {
        profile_id: profileId,
        category_id: apiCategoryId,
        started_at: new Date().toISOString(),
      });

      await setCurrentCards(topic, mappedCards);

      router.push({
        pathname: "/practice/[topic]",
        params: {
          topic,
          topicTitle: topicTitle ?? topic,
          language,
          languageLabel,
          apiLanguageId: apiLanguageId ?? "",
          apiLoaded: apiLoaded ?? "",
          apiCategoryId: apiCategoryId ?? "",
          difficulty: String(selectedDifficulty),
          lessonSessionId: lessonSession.session_id,
        },
      });
    } catch (error) {
      console.error("Failed to prepare lesson", error);
      setStatus("error");
      setErrorMessage("We couldn't start the lesson right now. Please try again.");
    } finally {
      setStarting(false);
      startLockRef.current = false;
    }
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="px-6 pt-4 pb-2 max-w-md w-full mx-auto flex-row items-center justify-between">
        <Pressable
          onPress={() =>
            router.replace({
              pathname: "/categories",
              params: {
                language,
                languageLabel,
                apiLanguageId: apiLanguageId ?? "",
                apiLoaded: apiLoaded ?? "",
                supportedDifficulties: supportedDifficulties ?? "",
              },
            })
          }
          className="w-10 h-10 items-center justify-center rounded-full bg-secondary"
        >
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </Pressable>
        {apiCategoryId ? (
          <Pressable
            onPress={handleToggleSave}
            disabled={saving}
            className="w-10 h-10 items-center justify-center rounded-full bg-secondary"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FF6B4A" />
            ) : (
              <Ionicons
                name={saved ? "bookmark" : "bookmark-outline"}
                size={20}
                color={saved ? "#FF6B4A" : "#1A1A1A"}
              />
            )}
          </Pressable>
        ) : null}
      </View>

      <View className="flex-1 items-center justify-center p-6">
        <View
          className="w-full max-w-md bg-card rounded-3xl p-8 items-center"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          <View className="w-24 h-24 bg-accent rounded-full items-center justify-center mb-6">
            {starting ? (
              <ActivityIndicator size="large" color="#FF6B4A" />
            ) : status === "empty" ? (
              <Ionicons name="albums-outline" size={48} color="#9CA3AF" />
            ) : status === "error" ? (
              <Ionicons name="alert-circle" size={48} color="#FF6B4A" />
            ) : (
              <Ionicons name="headset" size={48} color="#FF6B4A" />
            )}
          </View>

          <Text className="text-2xl font-semibold text-foreground mb-3 text-center">
            {starting
              ? "Preparing your lesson..."
              : status === "empty"
                ? "No lessons found for this category"
                : status === "error"
                  ? "Unable to load lesson"
                  : "Your lesson is ready"}
          </Text>

          <View className="mb-8 items-center gap-1">
            <Text className="text-muted">
              Language: <Text className="text-foreground font-medium">{languageLabel}</Text>
            </Text>
            <Text className="text-muted">
              Topic: <Text className="text-foreground font-medium">{topicTitle ?? topic}</Text>
            </Text>
            <View className="items-center gap-3 mt-5">
              <Text className="text-sm font-medium text-muted">Choose difficulty</Text>
              <View className="flex-row gap-2">
                {availableDifficulties.map((value) => {
                  const selected = selectedDifficulty === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => {
                        setSelectedDifficulty(value);
                        setStatus("ready");
                        setErrorMessage("");
                      }}
                      className={`w-11 h-11 rounded-full items-center justify-center border ${
                        selected
                          ? "bg-primary border-primary"
                          : "bg-secondary border-border"
                      }`}
                      disabled={starting || status === "error"}
                    >
                      <Text
                        className={`font-semibold ${
                          selected ? "text-primary-foreground" : "text-foreground"
                        }`}
                      >
                        {value}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {status === "empty" ? (
              <Text className="text-muted text-center">
                No lessons were returned for this difficulty.
              </Text>
            ) : null}
            {errorMessage ? (
              <Text className="text-muted text-center">{errorMessage}</Text>
            ) : null}
          </View>

          <Pressable
            onPress={handleStart}
            disabled={!canStart}
            className={`w-full py-4 rounded-2xl items-center ${
              canStart ? "bg-primary" : "bg-secondary"
            }`}
            style={
              canStart
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
            <Text
              className={`text-base font-semibold ${
                canStart ? "text-primary-foreground" : "text-muted"
              }`}
            >
              {starting ? "Starting..." : "Start Practice"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
