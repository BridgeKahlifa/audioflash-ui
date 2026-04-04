import { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth-context";
import { LanguageFlag } from "../components/LanguageFlag";
import {
  fetchSavedLessons,
  unsaveLesson,
  fetchLanguages,
  type ApiSavedLesson,
  type ApiLanguage,
} from "../lib/api";

export default function MyLibrary() {
  const { session } = useAuth();
  const [saved, setSaved] = useState<ApiSavedLesson[]>([]);
  const [languages, setLanguages] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        if (!session?.access_token) {
          setLoading(false);
          return;
        }
        setLoading(true);
        setErrorMessage("");
        try {
          const [savedData, langData] = await Promise.all([
            fetchSavedLessons(session.access_token),
            fetchLanguages(),
          ]);
          setSaved(savedData);
          const langMap = new Map<string, string>();
          langData.forEach((l: ApiLanguage) => langMap.set(l.id, l.language));
          setLanguages(langMap);
        } catch {
          setErrorMessage("We couldn't load your library right now. Please check your connection and try again.");
        } finally {
          setLoading(false);
        }
      }
      load();
    }, [session?.access_token]),
  );


  async function handleRemove(categoryId: string) {
    if (!session?.access_token || removingId) return;
    setRemovingId(categoryId);
    setErrorMessage("");
    try {
      await unsaveLesson(session.access_token, categoryId);
      setSaved((prev) => prev.filter((s) => s.category_id !== categoryId));
    } catch {
      setErrorMessage("We couldn't remove that lesson right now. Please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  function handleStart(lesson: ApiSavedLesson) {
    const langName = lesson.language_id ? languages.get(lesson.language_id) ?? "" : "";
    router.push({
      pathname: "/lesson-ready/[topic]",
      params: {
        topic: `saved-${lesson.category_id}`,
        topicTitle: lesson.category_name,
        language: langName.toLowerCase().replace(/\s+/g, "-"),
        languageLabel: langName,
        apiLoaded: "true",
        apiCategoryId: lesson.category_id,
        supportedDifficulties: (lesson.supported_difficulties ?? []).join(","),
      },
    });
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        {/* Header */}
        <View className="px-6 pt-6 pb-2 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-secondary"
          >
            <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
          </Pressable>
          <View>
            <Text className="text-2xl font-semibold text-foreground tracking-tight">
              My Library
            </Text>
            <Text className="text-muted text-sm">Your saved lesson packs</Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
          {loading ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#FF6B4A" />
            </View>
          ) : (
            <>
              {errorMessage ? (
                <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
                  <Text className="text-red-600 text-sm">{errorMessage}</Text>
                </View>
              ) : null}

              {saved.length === 0 ? (
                <View className="items-center py-16 gap-3">
                  <View className="w-16 h-16 rounded-full bg-secondary items-center justify-center">
                    <Ionicons name="bookmark-outline" size={28} color="#A0A0A0" />
                  </View>
                  <Text className="text-foreground font-medium text-center">No saved lessons yet</Text>
                  <Text className="text-muted text-sm text-center">
                    Save lessons from the library or generate new ones to see them here.
                  </Text>
                  <Pressable
                    onPress={() => router.push("/generate")}
                    className="mt-2 rounded-2xl px-5 py-3 bg-primary"
                    style={{
                      shadowColor: "#FF6B4A",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  >
                    <Text className="text-primary-foreground font-semibold">Generate a Lesson</Text>
                  </Pressable>
                </View>
              ) : (
                <View className="gap-3">
                  {saved.map((lesson) => {
                    const langName = lesson.language_id ? languages.get(lesson.language_id) : null;
                    return (
                      <View
                        key={lesson.id}
                        className="bg-card border border-border rounded-2xl p-4"
                        style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.05,
                          shadowRadius: 4,
                          elevation: 1,
                        }}
                      >
                        <View className="flex-row items-start gap-3">
                          <View className="w-11 h-11 rounded-xl bg-secondary items-center justify-center flex-shrink-0">
                            <LanguageFlag name={langName ?? ""} size="lg" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-foreground font-semibold">{lesson.category_name}</Text>
                            {langName ? (
                              <Text className="text-muted text-xs mt-0.5">{langName}</Text>
                            ) : null}
                            {lesson.supported_difficulties?.length > 0 && (
                              <Text className="text-muted text-xs mt-0.5">
                                Difficulty: {lesson.supported_difficulties.join(", ")}
                              </Text>
                            )}
                          </View>
                          <Pressable
                            onPress={() => handleRemove(lesson.category_id)}
                            disabled={removingId === lesson.category_id}
                            className="w-8 h-8 items-center justify-center rounded-full bg-secondary"
                          >
                            {removingId === lesson.category_id ? (
                              <ActivityIndicator size="small" color="#A0A0A0" />
                            ) : (
                              <Ionicons name="bookmark" size={16} color="#FF6B4A" />
                            )}
                          </Pressable>
                        </View>

                        <Pressable
                          onPress={() => handleStart(lesson)}
                          className="mt-3 py-2.5 rounded-xl bg-accent items-center"
                        >
                          <Text className="text-primary font-semibold text-sm">Start Lesson</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
